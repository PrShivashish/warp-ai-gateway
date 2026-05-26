import Anthropic from "@anthropic-ai/sdk";
import { Messages } from "../types";
import { BaseLlm, FinishReason, LlmResponse, LlmStreamResult, ProviderError } from "./Base";
import { TextBlock } from "@anthropic-ai/sdk/resources";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Maps Anthropic Claude's stop_reason to the normalized OpenAI FinishReason.
 * Reference: https://docs.anthropic.com/en/api/messages#body-stop-reason
 */
function mapClaudeStopReason(reason: string | null | undefined): FinishReason {
  switch (reason) {
    case "end_turn":      return "stop";
    case "stop_sequence": return "stop";
    case "max_tokens":    return "length";
    case "tool_use":      return "tool_calls";
    default:              return "stop";
  }
}

export class Claude extends BaseLlm {

  static async chat(model: string, messages: Messages): Promise<LlmResponse> {

    const systemMessages = messages.filter(m => m.role === "system");
    const nonSystemMessages = messages.filter(m => m.role !== "system");
    const systemPrompt = systemMessages.map(m => m.content).join("\n");

    let response;
    try {
      response = await client.messages.create({
        model,
        max_tokens: 2048,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: nonSystemMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content
        }))
      });
    } catch (err: any) {
      throw new ProviderError(err.status ?? 500, `Claude API error: ${err.message}`);
    }

    return {
      outputTokensConsumed: response.usage.output_tokens,
      inputTokensConsumed: response.usage.input_tokens,
      completions: {
        choices: response.content.map(c => ({
          message: { content: (c as TextBlock).text },
          finish_reason: mapClaudeStopReason(response.stop_reason),
        }))
      }
    };
  }

  static async chatStream(model: string, messages: Messages): Promise<LlmStreamResult> {

    const systemMessages = messages.filter(m => m.role === "system");
    const nonSystemMessages = messages.filter(m => m.role !== "system");
    const systemPrompt = systemMessages.map(m => m.content).join("\n");

    let stream;
    try {
      stream = client.messages.stream({
        model,
        max_tokens: 2048,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: nonSystemMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content
        }))
      });
    } catch (err: any) {
      throw new ProviderError(err.status ?? 500, `Claude Stream error: ${err.message}`);
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason: FinishReason = "stop";

    async function* tokenGenerator(): AsyncGenerator<string, void, unknown> {
      for await (const event of stream) {

        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }

        if (event.type === "message_start" && event.message.usage) {
          inputTokens = event.message.usage.input_tokens;
        }

        if (event.type === "message_delta" && event.usage) {
          outputTokens = event.usage.output_tokens;
          finishReason = mapClaudeStopReason(event.delta?.stop_reason);
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