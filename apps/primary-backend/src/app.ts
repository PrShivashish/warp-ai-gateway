import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { app as authApp } from "./modules/auth";
import { app as apiKeyApp } from "./modules/apiKeys";
import { app as modelsApp } from "./modules/models";
import { app as paymentsApp } from "./modules/payments";
import { app as metricsApp } from "./modules/metrics";
import { app as providerHealthApp } from "./modules/provider-health";
import { conversationApp } from "./modules/conversations";

export const app = new Elysia()
  .use(cors({
    // In production: set FRONTEND_ORIGIN=https://your-app.vercel.app
    // In development: localhost:3001 / localhost:3002 are automatically allowed
    origin: (request) => {
      const origin = request.headers.get('origin') || '';
      const prodOrigin = process.env.FRONTEND_ORIGIN;
      if (prodOrigin && origin === prodOrigin) return true;
      // Allow any localhost origin during development
      if (/^https?:\/\/localhost:\d+$/.test(origin)) return true;
      // Allow Vercel preview deployments (*.vercel.app)
      if (/\.vercel\.app$/.test(origin)) return true;
      return false;
    },
    credentials: true
  }))

  .get("/", () => ({
    status: "Warp Primary Backend is running",
    version: "1.0.0",
    health: "ok"
  }))
  .use(authApp)
  .use(apiKeyApp)
  .use(modelsApp)
  .use(paymentsApp)
  .use(metricsApp)
  .use(providerHealthApp)
  .use(conversationApp);

export type App = typeof app