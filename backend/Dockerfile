# ---------- BUILD STAGE ----------
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install ALL deps (including dev → tsc)
RUN npm ci

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build


# ---------- PRODUCTION STAGE ----------
FROM node:22-slim

WORKDIR /app

# Runtime deps only
RUN apt-get update && apt-get install -y \
    python3 \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp ONCE (system path)
RUN python3 -m pip install --no-cache-dir yt-dlp

# Copy runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install prod deps only
RUN npm ci --omit=dev && npm cache clean --force

# Non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 4000
CMD ["node", "dist/server.js"]
