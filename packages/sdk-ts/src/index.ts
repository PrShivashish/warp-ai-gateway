/**
 * Warp TypeScript SDK
 *
 * A lightweight, zero-dependency SDK for the Warp LLM gateway.
 *
 * @packageDocumentation
 */

// Client — primary exports
export { Warp, createOpenAICompatibleClient } from "./client";

// Deprecated aliases for backward compatibility
export { OpenRouter } from "./client";

// Types — primary exports
export type {
    WarpConfig,
    Message,
    ChatRequest,
    ChatResponse,
    ChatChoice,
    StreamEvent,
    Model,
    Company,
    ModelsResponse,
} from "./types";

export { WarpError } from "./types";

// Deprecated type aliases for backward compatibility
export type { OpenRouterConfig } from "./types";
export { OpenRouterError } from "./types";

// Stream utilities (advanced usage)
export { parseSSEStream } from "./stream";
