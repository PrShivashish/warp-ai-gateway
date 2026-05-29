/**
 * Centralised environment configuration for the dashboard frontend.
 *
 * In production (Vercel/HF), set these variables in the project settings:
 *   VITE_PRIMARY_API_URL  → your HF Space URL  (e.g. https://shivashish-warp-gateway.hf.space)
 *   VITE_GATEWAY_API_URL  → same HF Space URL  (traffic is multiplexed by nginx internally)
 *   VITE_DOCS_URL         → your deployed docs URL (optional)
 *
 * During local development the fallbacks keep everything running as-is.
 *
 * NOTE: Bun's dev server does not inject import.meta.env the same way Vite does,
 * so we use optional chaining (?.) to avoid a TypeError when it is undefined.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _env: Record<string, string | undefined> = (import.meta as any)?.env ?? {};

export const PRIMARY_API_URL =
  _env["VITE_PRIMARY_API_URL"] || "http://localhost:3000";

export const GATEWAY_API_URL =
  _env["VITE_GATEWAY_API_URL"] || "http://localhost:4000";

export const DOCS_URL =
  _env["VITE_DOCS_URL"] || "http://localhost:3002";

