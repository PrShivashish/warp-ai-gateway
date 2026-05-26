import { Messages } from "../types";

/**
 * Normalized finish reason values — mirrors the official OpenAI spec.
 * Every adapter must map its upstream provider-specific stop reason to one of these.
 */
export type FinishReason = "stop" | "length" | "content_filter" | "tool_calls";

export type LlmResponse = {
  completions: {
    choices: {
      message: {
        content: string
      }
      /** The reason the model stopped generating. Propagated from the upstream provider. */
      finish_reason: FinishReason
    }[]
  },
  inputTokensConsumed: number,
  outputTokensConsumed: number
}

export type LlmStreamResult = {
  stream: AsyncGenerator<string, void, unknown>;
  getUsage: () => { inputTokens: number; outputTokens: number };
  /** Returns the finish reason captured from the last provider chunk. */
  getFinishReason: () => FinishReason;
}

export class BaseLlm {
  static async chat(model: string, messages: Messages): Promise<LlmResponse> {
    throw new Error("Not implemented")
  }

  static async chatStream(model: string, messages: Messages): Promise<LlmStreamResult> {
    throw new Error("Not implemented")
  }
}

/**
 * Structured error thrown by all LLM adapters.
 * Carries the upstream HTTP status code so the circuit breaker can
 * distinguish user errors (4xx) from provider exhaustion (429, 50x).
 */
export class ProviderError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/**
 * Returns true if the error represents genuine provider exhaustion or downtime.
 *
 * STRICTLY limited to:
 *   429 — Provider-side rate limit (transient, retry on fallback)
 *   500–504 — Provider server errors / gateway timeouts (transient)
 *
 * 400/401/403 are intentionally EXCLUDED. These indicate operator configuration
 * errors (bad API key, malformed payload) that must fail loud to the client.
 * Silently failing over on these would cause misbilling on the fallback provider
 * without any alert that the primary key is misconfigured.
 */
export function isFailoverEligible(err: unknown): boolean {
  if (err instanceof ProviderError) {
    const s = err.statusCode;
    return s === 429 || (s >= 500 && s <= 504);
  }
  // Non-ProviderErrors (network timeouts, DNS failures, etc.) always failover
  return true;
}