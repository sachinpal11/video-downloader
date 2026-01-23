# =========================
# BUILD STAGE
# =========================
FROM node:22-slim AS builder

WORKDIR /app

# Copy configs
COPY package*.json tsconfig.json ./

# Install all deps (tsc required)
RUN npm ci

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build


# =========================
# PRODUCTION STAGE
# =========================
FROM node:22-slim

WORKDIR /app

# Install system dependencies (Render-safe)
RUN apt-get update && apt-get install -y \
    yt-dlp \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled backend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install prod deps only
RUN npm ci --omit=dev && npm cache clean --force

# Non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 4000

CMD ["node", "dist/server.js"]
