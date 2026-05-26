import bearer from "@elysiajs/bearer";
import { prisma, insertUsageMetric, pushTelemetryEvent } from "db";
import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { Conversation, OpenAIConversation, Messages } from "./types";
import { Gemini } from "./llms/Gemini";
import { OpenAi } from "./llms/OpenAi";
import { Claude } from "./llms/Claude";
import { MockLlm } from "./llms/Mock";
import { Groq } from "./llms/Groq";
import { LlmResponse, LlmStreamResult, ProviderError, isFailoverEligible } from "./llms/Base";
import { openapi } from '@elysiajs/openapi'
import {
  generateChatId,
  toOpenAIChatCompletion,
  toOpenAIStreamChunk,
  toOpenAIFinalChunk,
  toOpenAIError,
} from "./openai-compat";

import { rateLimiter } from "cache";

// ── Shared handler result types ──────────────────────────────────────
type HandlerSuccess = {
  ok: true;
  response: LlmResponse;
  model: string;
  userId: number;
  apiKey: string;
  providerName: string;
  inputTokenCost: number;
  outputTokenCost: number;
  conversationId?: string;
  didFailover: boolean;
};

type HandlerStreamSuccess = {
  ok: true;
  streaming: true;
  streamResult: LlmStreamResult;
  model: string;
  userId: number;
  apiKey: string;
  providerName: string;
  inputTokenCost: number;
  outputTokenCost: number;
  conversationId?: string;
  didFailover: boolean;
};

// ── Dispatch Helpers ──────────────────────────────────────────────────
async function dispatchChat(
  companyName: string,
  modelName: string,
  messages: Messages
): Promise<LlmResponse> {
  if (companyName === "google") return await Gemini.chat(modelName, messages);
  if (companyName === "openai") return await OpenAi.chat(modelName, messages);
  if (companyName === "anthropic") return await Claude.chat(modelName, messages);
  if (companyName === "groq") return await Groq.chat(modelName, messages);
  return await MockLlm.chat(modelName, messages);
}

async function dispatchStream(
  companyName: string,
  modelName: string,
  messages: Messages
): Promise<LlmStreamResult> {
  if (companyName === "google") return await Gemini.chatStream(modelName, messages);
  if (companyName === "openai") return await OpenAi.chatStream(modelName, messages);
  if (companyName === "anthropic") return await Claude.chatStream(modelName, messages);
  if (companyName === "groq") return await Groq.chatStream(modelName, messages);
  return await MockLlm.chatStream(modelName, messages);
}

type HandlerError = {
  ok: false;
  statusCode: number;
  message: string;
};

type HandlerResult = HandlerSuccess | HandlerStreamSuccess | HandlerError;

// ── Core handler — shared by both routes ─────────────────────────────
async function handleChatCompletion(
  apiKey: string | undefined,
  body: { model: string; messages: Messages; stream?: boolean }
): Promise<HandlerResult> {
  const startTime = performance.now();
  const model = body.model;
  const isStreaming = body.stream === true;
  const [_companyName, providerModelName] = model.split("/");

  // ── Rate Limiting (Phase C) ─────────────────────────────────────────
  if (apiKey) {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(apiKey);
    const keyHash = hasher.digest("hex");
    
    const estimatedTokens = body.messages.reduce((acc, m) => acc + m.content.length / 4, 0);
    
    const [rpmOk, tpmOk] = await Promise.all([
      rateLimiter.checkLimit(`warp:ratelimit:rpm:${keyHash}`, 60, 60, 1),
      rateLimiter.checkLimit(`warp:ratelimit:tpm:${keyHash}`, 40000, 60, Math.ceil(estimatedTokens))
    ]);

    if (!rpmOk || !tpmOk) {
      const latencyMs = Math.round(performance.now() - startTime);
      insertUsageMetric({
        userId: 0,
        apiKey: apiKey,
        model,
        provider: "unknown",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        latencyMs,
        success: false,
      });
      return { ok: false, statusCode: 429, message: "Rate limit exceeded." };
    }
  }

  const apiKeyDb = await prisma.apiKey.findFirst({
    where: {
      apiKey,
      disabled: false,
      deleted: false
    },
    select: {
      user: true
    }
  });

  if (!apiKeyDb) {
    const latencyMs = Math.round(performance.now() - startTime);
    insertUsageMetric({
      userId: 0,
      apiKey: apiKey ?? "unknown",
      model,
      provider: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: 0,
      latencyMs,
      success: false,
    });
    return { ok: false, statusCode: 403, message: "Invalid api key" };
  }

  if (apiKeyDb?.user.walletBalance <= 0) {
    const latencyMs = Math.round(performance.now() - startTime);
    insertUsageMetric({
      userId: apiKeyDb.user.id,
      apiKey: apiKey ?? "unknown",
      model,
      provider: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: 0,
      latencyMs,
      success: false,
    });
    return {
      ok: false,
      statusCode: 402,
      message: "Insufficient funds. Your Warp seed grant has been exhausted.",
    };
  }

  const modelDb = await prisma.model.findFirst({
    where: { slug: model }
  });

  if (!modelDb) {
    const latencyMs = Math.round(performance.now() - startTime);
    insertUsageMetric({
      userId: apiKeyDb.user.id,
      apiKey: apiKey ?? "unknown",
      model,
      provider: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: 0,
      latencyMs,
      success: false,
    });
    return { ok: false, statusCode: 404, message: "This is an invalid model we dont support" };
  }

  const providers = await prisma.modelProviderMapping.findMany({
    where: { modelId: modelDb.id },
    include: {
      provider: true,
      model: true,
      fallbackMapping: {
        include: { provider: true, model: true }
      }
    },
    // Deterministic cheapest-first routing:
    // Sort by inputTokenCost ascending (cheapest first), break ties by output cost, then by id.
    // This eliminates non-deterministic billing caused by random provider selection.
    orderBy: [
      { inputTokenCost: "asc" },
      { outputTokenCost: "asc" },
      { id: "asc" },
    ],
  });

  const provider = providers[0]; // Always the cheapest available mapping
  const companyName = model.split("/")[0];

  // ── CONVERSATION PERSISTENCE ──────────────────────────────────
  let conversationId = (body as any).conversation_id;
  if (!conversationId && apiKeyDb.user.id) {
    // Auto-create conversation if missing
    // We'll use the first 50 chars of the first message as title
    const firstMsg = body.messages.find(m => m.role === 'user')?.content || "New Chat";
    const title = firstMsg.slice(0, 50) + (firstMsg.length > 50 ? "..." : "");

    const conv = await prisma.conversation.create({
      data: {
        userId: apiKeyDb.user.id,
        title,
      }
    });
    conversationId = conv.id;
  }

  // Save the incoming user message (only the last one if it's new)
  const lastUserMsg = body.messages.filter(m => m.role === 'user').pop();
  if (conversationId && lastUserMsg) {
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: lastUserMsg.content,
      }
    });
  }

  // ── STREAMING PATH ──────────────────────────────────────────────
  if (isStreaming) {
    let streamResult: LlmStreamResult | null = null;
    let activeProvider = provider as any;
    let didFailover = false;

    try {
      streamResult = await dispatchStream(companyName, providerModelName, body.messages);
    } catch (primaryErr: unknown) {
      if (isFailoverEligible(primaryErr) && provider.fallbackMapping) {
        const fallback = provider.fallbackMapping as any;
        const [fallbackCompany, fallbackModelName] = fallback.model.slug.split("/");
        console.warn(
          `[circuit-breaker] Primary ${companyName}/${providerModelName} failed ` +
          `(${primaryErr instanceof ProviderError ? primaryErr.statusCode : "network"}), ` +
          `failing over to ${fallbackCompany}/${fallbackModelName}`
        );
        try {
          streamResult = await dispatchStream(fallbackCompany, fallbackModelName, body.messages);
          activeProvider = fallback;
          didFailover = true;
        } catch (fallbackErr: unknown) {
          return { ok: false, statusCode: 503, message: "All providers unavailable" };
        }
      } else if (!isFailoverEligible(primaryErr)) {
        const code = primaryErr instanceof ProviderError ? primaryErr.statusCode : 500;
        return { ok: false, statusCode: code, message: (primaryErr as Error).message };
      } else {
        return { ok: false, statusCode: 503, message: "Provider unavailable and no fallback configured" };
      }
    }

    if (!streamResult) {
      return { ok: false, statusCode: 500, message: "Internal server error during stream dispatch" };
    }

    return {
      ok: true,
      streaming: true,
      streamResult,
      model: activeProvider.model.slug,
      userId: apiKeyDb.user.id,
      apiKey: apiKey ?? "unknown",
      providerName: activeProvider.provider.name,
      inputTokenCost: activeProvider.inputTokenCost,
      outputTokenCost: activeProvider.outputTokenCost,
      conversationId,
      didFailover,
    };
  }

  // ── NON-STREAMING PATH ─────────────────────────────────────────
  let response: LlmResponse | null = null;
  let activeProvider = provider as any;
  let didFailover = false;

  try {
    response = await dispatchChat(companyName, providerModelName, body.messages);
  } catch (primaryErr: unknown) {
    if (isFailoverEligible(primaryErr) && provider.fallbackMapping) {
      const fallback = provider.fallbackMapping as any;
      const [fallbackCompany, fallbackModelName] = fallback.model.slug.split("/");
      console.warn(
        `[circuit-breaker] Primary ${companyName}/${providerModelName} failed ` +
        `(${primaryErr instanceof ProviderError ? primaryErr.statusCode : "network"}), ` +
        `failing over to ${fallbackCompany}/${fallbackModelName}`
      );
      try {
        response = await dispatchChat(fallbackCompany, fallbackModelName, body.messages);
        activeProvider = fallback;
        didFailover = true;
      } catch (fallbackErr: unknown) {
        return { ok: false, statusCode: 503, message: "All providers unavailable" };
      }
    } else if (!isFailoverEligible(primaryErr)) {
      const code = primaryErr instanceof ProviderError ? primaryErr.statusCode : 500;
      return { ok: false, statusCode: code, message: (primaryErr as Error).message };
    } else {
      return { ok: false, statusCode: 503, message: "Provider unavailable and no fallback configured" };
    }
  }

  if (!response) {
    return { ok: false, statusCode: 500, message: "Internal server error during chat dispatch" };
  }

  const inputTokens = response.inputTokensConsumed;
  const outputTokens = response.outputTokensConsumed;
  const totalTokens = inputTokens + outputTokens;
  const cost = (inputTokens * activeProvider.inputTokenCost) + (outputTokens * activeProvider.outputTokenCost);
  const latencyMs = Math.round(performance.now() - startTime);

  // Save assistant message if in a conversation
  if (conversationId) {
    await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: response.completions.choices[0].message.content,
        model: model,
      }
    });
  }

  // ── Async telemetry: push to Redis queue (wallet deduction + metric) ──────
  // Fire-and-forget: RPUSH completes in <1 ms; worker flushes every 10 s.
  // Falls back to direct Prisma writes if Redis is unavailable (zero data loss).
  pushTelemetryEvent({
    userId: apiKeyDb.user.id,
    apiKey: apiKey ?? "unknown",
    model: activeProvider.model.slug,
    provider: activeProvider.provider.name,
    inputTokens,
    outputTokens,
    totalTokens,
    cost,
    latencyMs,
    success: true,
    deductWallet: true,
  }).catch((err) => console.error("[api-backend] pushTelemetryEvent failed:", err));

  return {
    ok: true,
    response,
    model: activeProvider.model.slug,
    userId: apiKeyDb.user.id,
    apiKey: apiKey ?? "unknown",
    providerName: activeProvider.provider.name,
    inputTokenCost: activeProvider.inputTokenCost,
    outputTokenCost: activeProvider.outputTokenCost,
    conversationId,
    didFailover,
  };
}

// ── Build streaming Response for the legacy route ────────────────────
function buildLegacyStreamResponse(result: HandlerStreamSuccess): Response {
  const { streamResult, model, userId, apiKey, providerName, inputTokenCost, outputTokenCost } = result;
  const { stream: tokenStream, getUsage } = streamResult;
  const startTime = performance.now();

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        let accumulated = "";
        for await (const token of tokenStream) {
          accumulated += token;
          const chunk = JSON.stringify({
            choices: [{ delta: { content: token } }]
          });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        const latencyMs = Math.round(performance.now() - startTime);
        const usage = getUsage();

        if (result.conversationId && accumulated) {
          prisma.message.create({
            data: {
              conversationId: result.conversationId,
              role: "assistant",
              content: accumulated,
              model,
            }
          }).catch(() => { });
        }
        const totalTokens = usage.inputTokens + usage.outputTokens;
        const cost = (usage.inputTokens * inputTokenCost) + (usage.outputTokens * outputTokenCost);

        // ── Async telemetry: enqueue for batch processing ──────────────────
        pushTelemetryEvent({
          userId, apiKey, model, provider: providerName,
          inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
          totalTokens, cost, latencyMs, success: true,
          deductWallet: true,
        }).catch(() => { });
      } catch (err) {
        const errorChunk = JSON.stringify({ error: { message: "Stream interrupted" } });
        controller.enqueue(encoder.encode(`data: ${errorChunk}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        const latencyMs = Math.round(performance.now() - startTime);
        insertUsageMetric({
          userId, apiKey, model, provider: providerName,
          inputTokens: 0, outputTokens: 0, totalTokens: 0,
          cost: 0, latencyMs, success: false,
        });
      }
    }
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Powered-By": "Warp",
    "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN ?? "*",
    "Access-Control-Allow-Credentials": "true",
  };
  if (result.didFailover) headers["X-Warp-Failover"] = "true";

  return new Response(readable, { headers });
}
function buildOpenAIStreamResponse(result: HandlerStreamSuccess): Response {
  const { streamResult, model, userId, apiKey, providerName, inputTokenCost, outputTokenCost } = result;
  const { stream: tokenStream, getUsage } = streamResult;
  const startTime = performance.now();
  const chatId = generateChatId();

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        let accumulated = "";
        for await (const token of tokenStream) {
          accumulated += token;
          const chunk = JSON.stringify(toOpenAIStreamChunk(token, chatId, model));
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        }
        // Resolve usage and finish reason BEFORE emitting the final chunk so the
        // usage data is available to embed in the SSE termination event.
        const latencyMs = Math.round(performance.now() - startTime);
        const usage = getUsage();

        if (result.conversationId && accumulated) {
          prisma.message.create({
            data: {
              conversationId: result.conversationId,
              role: "assistant",
              content: accumulated,
              model,
            }
          }).catch(() => { });
        }
        const totalTokens = usage.inputTokens + usage.outputTokens;
        const cost = (usage.inputTokens * inputTokenCost) + (usage.outputTokens * outputTokenCost);

        // Final chunk: embeds usage so stream_options.include_usage consumers get billing data
        const finalChunk = JSON.stringify(toOpenAIFinalChunk(chatId, model, {
          prompt_tokens: usage.inputTokens,
          completion_tokens: usage.outputTokens,
          total_tokens: totalTokens,
        }));
        controller.enqueue(encoder.encode(`data: ${finalChunk}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        // ── Async telemetry: enqueue for batch processing ──────────────────
        pushTelemetryEvent({
          userId, apiKey, model, provider: providerName,
          inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
          totalTokens, cost, latencyMs, success: true,
          deductWallet: true,
        }).catch(() => { });
      } catch (err) {
        const errorChunk = JSON.stringify(toOpenAIError(500, "Stream interrupted"));
        controller.enqueue(encoder.encode(`data: ${errorChunk}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        const latencyMs = Math.round(performance.now() - startTime);
        insertUsageMetric({
          userId, apiKey, model, provider: providerName,
          inputTokens: 0, outputTokens: 0, totalTokens: 0,
          cost: 0, latencyMs, success: false,
        });
      }
    }
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Powered-By": "Warp",
    "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN ?? "*",
    "Access-Control-Allow-Credentials": "true",
  };
  if (result.didFailover) headers["X-Warp-Failover"] = "true";

  return new Response(readable, { headers });
}

// ── Elysia App ───────────────────────────────────────────────────────
const app = new Elysia()
  .onError(({ code, error, set, path, body }) => {
    console.error(`❌ [${code}] Error at ${path}:`, error);
    if (code === 'VALIDATION') {
      console.error("Payload that failed validation:", JSON.stringify(body, null, 2));
      return {
        error: "Validation failed",
        details: error.all
      }
    }
  })

  .use(cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3001",
    credentials: true,
  }))
  .use(bearer())
  .use(openapi())
  .get("/", () => ({
    status: "Warp API Gateway is running",
    version: "1.0.0",
    health: "ok"
  }))

  // ── Legacy route (backward compatible) ───────────────────────────
  .post("/api/v1/chat/completions", async ({ set, status, bearer: apiKey, body }) => {
    const result = await handleChatCompletion(apiKey, body);

    if (!result.ok) {
      return status(result.statusCode as any, { message: result.message });
    }

    if (result.didFailover) set.headers["X-Warp-Failover"] = "true";

    if ("streaming" in result) {
      return buildLegacyStreamResponse(result);
    }

    return result.response;
  }, {
    body: Conversation
  })

  // ── OpenAI-compatible route (/v1/chat/completions) ───────────────
  .post("/v1/chat/completions", async ({ set, status, bearer: apiKey, body }) => {
    const result = await handleChatCompletion(apiKey, body);

    if (!result.ok) {
      return status(result.statusCode as any, toOpenAIError(result.statusCode, result.message));
    }

    if (result.didFailover) set.headers["X-Warp-Failover"] = "true";

    if ("streaming" in result) {
      return buildOpenAIStreamResponse(result);
    }

    return toOpenAIChatCompletion(result.response, result.model);
  }, {
    body: OpenAIConversation
  })

  .listen(process.env.PORT ? parseInt(process.env.PORT) : 4000);

console.log(
  `⚡ Warp API Gateway is running at ${app.server?.hostname}:${app.server?.port}`
);