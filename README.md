# ⚡ Warp — The Multi-Provider LLM Gateway Platform

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Tech Stack: Bun](https://img.shields.io/badge/Runtime-Bun-black?logo=bun)](https://bun.sh/)
[![Framework: Elysia](https://img.shields.io/badge/Framework-Elysia-violet)](https://elysiajs.com/)
[![Database: Prisma](https://img.shields.io/badge/Database-Prisma_&_Postgres-blue?logo=prisma)](https://www.prisma.io/)
[![Caching: Redis](https://img.shields.io/badge/Cache-Redis-red?logo=redis)](https://redis.io/)

Warp is an enterprise-grade, high-performance, multi-provider LLM gateway and dashboard. It provides developers with a **single unified endpoint** to route requests across OpenAI, Gemini, Claude, and deep-learning providers deterministically while handling auth, real-time wallet billing, telemetry logging, caching, and automatic failovers.

---

## 🎨 Visual Tour (Application Interface)

### 1. Landing Page
A dark-themed, premium entry point built with custom CSS animations and glassmorphism.
![Landing Page](./Screenshots/landing%20page.png)
*Home Page featuring direct API request code snippets.*

---

### 2. Secure Console Access
Multi-tenant registration and authentication routing with direct validation.
![Console Login](./Screenshots/login.png)
*Authentication Console with secure JWT validation.*

---

### 3. Neural Hub (Main Dashboard)
A comprehensive control panel showcasing API key volumes, spent funds, and model status at a glance.
![Main Dashboard](./Screenshots/dashboard.png)
*Neural Hub landing displaying keys status, funds consumed, and active systems.*

---

### 4. Developer API Key Manager
Create, rotate, enable/disable, and track token consumption limits per key.
![API Keys](./Screenshots/access%20key.png)
*Sleek list view of developer keys and cumulative credit usage.*

---

### 5. Telemetry & Latency Analytics
Dynamic charting and statistical breakdown of request counts, response latency, and cost telemetry.
![Telemetry Analytics](./Screenshots/analytics.png)
*Token throughput, costs, and P95 latency tracking dashboard.*

---

### 6. Interactive Chat Playground
Test different models live with streaming Server-Sent Events (SSE) directly inside the console.
![Chat Playground](./Screenshots/chat.png)
*Chat playground interface displaying real-time streaming output from Llama models.*

---

## 🏗 Core Architecture

```mermaid
graph TD
    Client[Client App] -->|POST /v1/chat/completions| Gateway[Warp Gateway / Elysia]
    Gateway --> Auth[API Key Auth & Rate Limiter]
    Auth -->|Valid Key| WalletCheck[Wallet Balance Check]
    WalletCheck -->|Balance > $0.00| Router[Cheapest-Cheapest Provider Router]
    Router -->|Try Primary| Upstream[Upstream Provider: OpenAI/Gemini/Groq]
    Upstream -->|Failover 429/50x| CircuitBreaker[Circuit Breaker / Fallback Route]
    CircuitBreaker -->|Try Fallback| UpstreamFallback[Cheapest Alternative Provider]
    UpstreamFallback --> Response[SSE / JSON Response]
    Upstream --> Response
    Response --> Telemetry[Telemetry Logging & Ledger Debit]
    Telemetry --> DB[(Neon PostgreSQL)]
    Telemetry --> Cache[(Redis Cache)]
```

---

## 🧩 Monorepo Structure

```
warp/
├── apps/
│   ├── api-backend/          # OpenAI-compatible API gateway (Elysia, Node/Bun)
│   ├── primary-backend/      # Core Auth, User Management, and Wallet Gateway
│   ├── dashboard-frontend/   # Admin Dashboard & Chat Playground (React + Tailwind)
│   └── docs/                 # Developer Documentation & Playground (Next.js + Nextra)
├── packages/
│   ├── db/                   # Prisma schema, migrations, and shared client
│   ├── cache/                # Redis configuration and Lua caching utilities
│   ├── sdk-ts/               # Official Warp TypeScript SDK
│   ├── ui/                   # Shared UI component library
│   ├── eslint-config/        # Monorepo linting specs
│   └── typescript-config/    # Monorepo tsconfigs
```

---

## 🛠 Tech Stack

| Layer | Technologies | Description |
|---|---|---|
| **Runtime** | `Bun` | Ultra-fast Javascript runtime & package manager |
| **API Gateway** | `Elysia` | High-performance, Type-safe framework for Bun |
| **ORM** | `Prisma 7` | Database schema definition & client generation |
| **Database** | `PostgreSQL (Neon)` | Serverless SQL database with float precision costs |
| **Caching / Queues** | `Redis (Upstash)` | Lua-scripted rate limiter and telemetry cache |
| **Frontend UI** | `React 19` | Modern dashboard UI with custom glassmorphism components |
| **Docs Engine** | `Next.js 15` | Nextra-powered developer docs & playground |

---

## ⚡ Performance Features

- **Float Cost Precision**: Replaced raw integer credit tracking with true micro-cent float cost calculations (no scale limits).
- **Deterministic Routing**: Request routing is evaluated cheaper-first, sorting mappings dynamically by `inputTokenCost` and `outputTokenCost`.
- **Smart Failovers**: Automatic circuit breaker failovers strictly for transient failures (`429 Rate Limits`, `5xx Errors`), letting client errors (`400 Bad Request`) fail-fast.
- **Server-Sent Events (SSE)**: Streaming tokens directly from providers to clients with full OpenAI compatibility.

---

## 🚀 Running Locally

### 1. Prerequisite Containers
Ensure you have Docker running to mount the PostgreSQL database and Redis services:
```bash
# Start pre-configured database and cache containers
docker start warp-postgres warp-redis
```

### 2. Setup Environment Configuration
Configure database and server environments inside the respective packages:
- Copy packages/db/.env:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/warp?schema=public"
```

- Copy apps/api-backend/.env:
```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/warp?schema=public"
REDIS_URL="redis://localhost:6380"
```

### 3. Sync Database Schema
Run the Prisma schema sync and generation commands:
```bash
# Push schema changes to the local/production instance
bun --env-file=packages/db/.env run --bun packages/db/node_modules/prisma/build/index.js db push --schema=packages/db/prisma/schema.prisma --config=packages/db/prisma.config.ts

# Regenerate Prisma Client
bun --env-file=packages/db/.env run --bun packages/db/node_modules/prisma/build/index.js generate --schema=packages/db/prisma/schema.prisma --config=packages/db/prisma.config.ts
```

### 4. Launch the Dev Servers
From the root folder, launch the monorepo dev stack:
```bash
# Install dependencies
bun install

# Run all microservices in parallel
bun run dev
```

---

## 🔌 SDK Integration

Get started with the TypeScript SDK in seconds:

```ts
import { Warp } from "warp-sdk";

const client = new Warp({ 
  apiKey: "sk-or-v1-dBZ...Wfx2",
  baseURL: "http://localhost:4000/v1" 
});

// Stream completions
const stream = await client.chat.completions.create({
  model: "google/gemini-2.0-flash",
  messages: [{ role: "user", content: "Explain quantum mechanics in one sentence." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

---

## 🛡 License
Warp is licensed under the Apache 2.0 License.
