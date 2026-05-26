import { Messages } from "../types";
import { BaseLlm, FinishReason, LlmResponse, LlmStreamResult, ProviderError } from "./Base";

export class Groq extends BaseLlm {
  private static readonly API_URL = "https://api.groq.com/openai/v1/chat/completions";

  static async chat(model: string, messages: Messages): Promise<LlmResponse> {
    const response = await fetch(this.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ProviderError(response.status, `Groq API error: ${error}`);
    }

    const data = await response.json();
    return {
      inputTokensConsumed: data.usage?.prompt_tokens ?? 0,
      outputTokensConsumed: data.usage?.completion_tokens ?? 0,
      completions: {
        // Groq uses OpenAI's finish_reason values natively — pass through directly.
        choices: data.choices.map((c: any) => ({
          message: { content: c.message.content },
          finish_reason: (c.finish_reason ?? "stop") as FinishReason,
        }))
      }
    };
  }

  static async chatStream(model: string, messages: Messages): Promise<LlmStreamResult> {
    const response = await fetch(this.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ProviderError(response.status, `Groq Stream error: ${error}`);
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason: FinishReason = "stop";

    async function* tokenGenerator(): AsyncGenerator<string, void, unknown> {
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload);
            const token = parsed.choices[0]?.delta?.content;
            if (token) yield token;

            // Capture finish_reason from the final delta chunk
            const reason = parsed.choices[0]?.finish_reason;
            if (reason) finishReason = reason as FinishReason;

            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens;
              outputTokens = parsed.usage.completion_tokens;
            }
          } catch (e) {
            // Silently ignore parse errors for partial chunks
          }
        }
      }
    }

    return {
      stream: tokenGenerator(),
      getUsage: () => ({ inputTokens, outputTokens }),
      getFinishReason: () => finishReason,
    };
  }
}
