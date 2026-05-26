import { Messages } from "../types";
import { BaseLlm, FinishReason, LlmResponse, LlmStreamResult, ProviderError } from "./Base";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Maps the OpenAI Responses API's response.status to the normalized FinishReason.
 * Reference: https://platform.openai.com/docs/api-reference/responses/object#responses/object-status
 */
function mapOpenAIStatus(status: string | undefined): FinishReason {
  switch (status) {
    case "completed":  return "stop";
    case "incomplete": return "length";
    default:           return "stop";
  }
}

export class OpenAi extends BaseLlm {

  static async chat(model: string, messages: Messages): Promise<LlmResponse> {
    let response;
    try {
      response = await client.responses.create({
        model,
        input: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      });
    } catch (err: any) {
      throw new ProviderError(err.status ?? 500, `OpenAI API error: ${err.message}`);
    }

    return {
      inputTokensConsumed: response.usage?.input_tokens ?? 0,
      outputTokensConsumed: response.usage?.output_tokens ?? 0,
      completions: {
        choices: [{
          message: { content: response.output_text ?? "" },
          finish_reason: mapOpenAIStatus(response.status),
        }]
      }
    };
  }

  static async chatStream(model: string, messages: Messages): Promise<LlmStreamResult> {

    let stream;
    try {
      stream = await client.responses.stream({
        model,
        input: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      });
    } catch (err: any) {
      throw new ProviderError(err.status ?? 500, `OpenAI Stream error: ${err.message}`);
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason: FinishReason = "stop";

    async function* tokenGenerator(): AsyncGenerator<string, void, unknown> {
      for await (const event of stream) {

        if (event.type === "response.output_text.delta") {
          yield event.delta;
        }

        if (event.type === "response.completed") {
          inputTokens = event.response.usage?.input_tokens ?? 0;
          outputTokens = event.response.usage?.output_tokens ?? 0;
          finishReason = mapOpenAIStatus(event.response.status);
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