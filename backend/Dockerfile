# =========================
# BUILD STAGE
# =========================
FROM node:22-slim AS builder

WORKDIR /app

# Copy config first
COPY package*.json tsconfig.json ./

# Install ALL deps (tsc needed)
RUN npm ci

# Copy source
COPY src ./src

# Build TS → dist/
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
    pipx \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Enable pipx path
ENV PATH="/root/.local/bin:$PATH"

# Install yt-dlp SAFELY (PEP 668 compliant)
RUN pipx install yt-dlp

# Copy compiled backend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production node deps only
RUN npm ci --omit=dev && npm cache clean --force

# Optional cookies directory (recommended to mount via env/volume)
# COPY cookies ./cookies

# Security: non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 4000

CMD ["node", "dist/server.js"]
