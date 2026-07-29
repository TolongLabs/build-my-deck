# One deployable service: Bun/Hono API + static Vite bundle + pinned Chromium, all in one
# container. No Compose, no worker, no second service — see docs/trd.md "Deployment".

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json biome.json ./
COPY packages ./packages
COPY apps ./apps
RUN bun install --frozen-lockfile
RUN bun run build

FROM oven/bun:1
WORKDIR /app

# Pinned Chromium for server-primary Playwright validation/export (Q13), plus the system
# libraries headless Chromium needs on Debian-based images.
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app
RUN bunx playwright install --with-deps chromium

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# Persistent mount reserved for the identity/control ledger (task 6B) — no deck/asset data
# is ever stored server-side in iteration 1.
VOLUME ["/data"]
EXPOSE 3000

CMD ["bun", "run", "apps/api/src/index.ts"]
