import { LlmResponse } from "./llms/Base";

/** Warp's static system fingerprint — identifies the gateway version in all responses. */
const SYSTEM_FINGERPRINT = "fp_warp_native_v1";

// ── ID Generation ────────────────────────────────────────────────────
let counter = 0;
export function generateChatId(): string {
    const timestamp = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `chatcmpl-${timestamp}${rand}${(counter++).toString(36)}`;
}

// ── Non-Streaming Response Mapper ────────────────────────────────────
export function toOpenAIChatCompletion(
    response: LlmResponse,
    model: string
) {
    return {
        id: generateChatId(),
        object: "chat.completion" as const,
        created: Math.floor(Date.now() / 1000),
        model,
        system_fingerprint: SYSTEM_FINGERPRINT,
        choices: response.completions.choices.map((choice, index) => ({
            index,
            message: {
                role: "assistant" as const,
                content: choice.message.content,
            },
            finish_reason: choice.finish_reason,
            logprobs: null,
        })),
        usage: {
            prompt_tokens: response.inputTokensConsumed,
            completion_tokens: response.outputTokensConsumed,
            total_tokens: response.inputTokensConsumed + response.outputTokensConsumed,
        },
    };
}

// ── Streaming Chunk Mapper ───────────────────────────────────────────
export function toOpenAIStreamChunk(
    token: string,
    id: string,
    model: string,
    index: number = 0
) {
    return {
        id,
        object: "chat.completion.chunk" as const,
        created: Math.floor(Date.now() / 1000),
        model,
        system_fingerprint: SYSTEM_FINGERPRINT,
        choices: [
            {
                index,
                delta: { content: token },
                finish_reason: null,
                logprobs: null,
            },
        ],
    };
}

// ── Final Stream Chunk (finish_reason: stop + optional usage) ────────
/**
 * Emits the SSE termination chunk.
 *
 * Optionally accepts a `usage` object — when provided it is embedded in the
 * chunk payload so that OpenAI SDK callers using
 * `stream_options: { include_usage: true }` receive complete billing data.
 */
export function toOpenAIFinalChunk(
    id: string,
    model: string,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
) {
    return {
        id,
        object: "chat.completion.chunk" as const,
        created: Math.floor(Date.now() / 1000),
        model,
        system_fingerprint: SYSTEM_FINGERPRINT,
        choices: [
            {
                index: 0,
                delta: {},
                finish_reason: "stop" as const,
                logprobs: null,
            },
        ],
        // Include usage only when caller provides it (respects stream_options)
        ...(usage ? { usage } : {}),
    };
}

// ── Error Mapper ─────────────────────────────────────────────────────
type OpenAIErrorType =
    | "invalid_request_error"
    | "authentication_error"
    | "insufficient_quota"
    | "server_error"
    | "not_found_error"
    | "requests";

export function toOpenAIError(
    statusCode: number,
    message: string
) {
    let type: OpenAIErrorType;
    let code: string;

    switch (statusCode) {
        case 401:
        case 403:
            type = "authentication_error";
            code = "invalid_api_key";
            break;
        case 402:
            type = "insufficient_quota";
            code = "insufficient_quota";
            break;
        case 404:
            type = "not_found_error";
            code = "model_not_found";
            break;
        case 400:
            type = "invalid_request_error";
            code = "invalid_request";
            break;
        case 429:
            type = "requests";
            code = "429";
            break;
        default:
            type = "server_error";
            code = "internal_error";
            break;
    }

    return {
        error: {
            message,
            type,
            code,
        },
    };
}
