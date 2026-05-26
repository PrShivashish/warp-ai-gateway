import { Messages } from "../types";
import { BaseLlm, FinishReason, LlmResponse, LlmStreamResult, ProviderError } from "./Base";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ""
});

/**
 * Maps Google Gemini's provider-specific finish reason to the normalized OpenAI spec value.
 * Reference: https://ai.google.dev/api/generate-content#v1beta.FinishReason
 */
function mapGeminiFinishReason(reason: string | undefined): FinishReason {
  switch (reason) {
    case "STOP":       return "stop";
    case "MAX_TOKENS": return "length";
    case "SAFETY":     return "content_filter";
    case "RECITATION": return "content_filter";
    default:           return "stop";
  }
}

export class Gemini extends BaseLlm {

  static async chat(model: string, messages: Messages): Promise<LlmResponse> {
    // ── Separate system messages from conversation messages ──────────────
    const systemText = messages
      .filter(m => m.role === "system")
      .map(m => m.content)
      .join("\n");

    const conversationContents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    let response;
    try {
      response = await ai.models.generateContent({
        model,
        ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
        contents: conversationContents,
      });
    } catch (err: any) {
      throw new ProviderError(err.status ?? 500, `Gemini API error: ${err.message}`);
    }

    const finishReason = mapGeminiFinishReason(response.candidates?.[0]?.finishReason);

    return {
      outputTokensConsumed: response.usageMetadata?.candidatesTokenCount ?? 0,
      inputTokensConsumed: response.usageMetadata?.promptTokenCount ?? 0,
      completions: {
        choices: [{
          message: { content: response.text ?? "" },
          finish_reason: finishReason,
        }]
      }
    };
  }

  static async chatStream(model: string, messages: Messages): Promise<LlmStreamResult> {
    // ── Separate system messages from conversation messages ──────────────
    const systemText = messages
      .filter(m => m.role === "system")
      .map(m => m.content)
      .join("\n");

    const conversationContents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    let response;
    try {
      response = await ai.models.generateContentStream({
        model,
        ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
        contents: conversationContents,
      });
    } catch (err: any) {
      throw new ProviderError(err.status ?? 500, `Gemini Stream error: ${err.message}`);
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason: FinishReason = "stop";

    async function* tokenGenerator(): AsyncGenerator<string, void, unknown> {
      for await (const chunk of response) {
        if (chunk.usageMetadata) {
          inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
          outputTokens = chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
        }
        // Capture finish reason from each chunk (last non-null value wins)
        const chunkReason = chunk.candidates?.[0]?.finishReason;
        if (chunkReason) {
          finishReason = mapGeminiFinishReason(chunkReason);
        }
        if (chunk.text) yield chunk.text;
      }
    }

    return {
      stream: tokenGenerator(),
      getUsage: () => ({ inputTokens, outputTokens }),
      getFinishReason: () => finishReason,
    };
  }
}