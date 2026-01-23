# =========================
# BUILD STAGE
# =========================
FROM node:22-slim AS builder

WORKDIR /app

# Copy config files
COPY package*.json tsconfig.json ./

# Install ALL deps (tsc required)
RUN npm ci

# Copy source
COPY src ./src

# Build TypeScript → dist/
RUN npm run build


# =========================
# PRODUCTION STAGE
# =========================
FROM node:22-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (latest, stable)
RUN pip3 install --no-cache-dir --upgrade yt-dlp

# Copy compiled backend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production deps only
RUN npm ci --omit=dev && npm cache clean --force

# Optional: cookies folder (if mounted via Koyeb env or volume)
# COPY cookies ./cookies

# Security: non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose API port
EXPOSE 4000

# Start server
CMD ["node", "dist/server.js"]
