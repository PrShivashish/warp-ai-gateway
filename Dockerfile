# ───────────────────────────────────────────────────────────────
# Warp — Multi-service Dockerfile for Hugging Face Spaces
# Port 7860 is required by HF Spaces. Nginx multiplexes:
#   /*     → primary-backend (port 3000)   auth, keys, metrics
#   /v1/*  → api-gateway     (port 4000)   LLM proxy
# ───────────────────────────────────────────────────────────────

FROM oven/bun:1.1-debian AS base

# --- System dependencies -------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# --- Create required log directories (absent from base image) ------------
RUN mkdir -p /var/log/supervisor /var/log/nginx /var/run

# --- Workdir ---------------------------------------------------------------
WORKDIR /app

# --- Copy orchestration config FIRST (before source copy) ----------------
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/warp.conf

# --- Copy monorepo source --------------------------------------------------
COPY . .

# --- Install all workspace dependencies ------------------------------------
RUN bun install --frozen-lockfile

# --- Generate Prisma client ------------------------------------------------
RUN cd packages/db && bunx prisma generate

# --- Expose the single HF-required port -----------------------------------
EXPOSE 7860

# --- Entrypoint: supervisord manages everything ---------------------------
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/warp.conf"]
