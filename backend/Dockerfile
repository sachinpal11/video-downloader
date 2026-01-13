# Multi-stage build for ultra-fast video downloader
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies (yt-dlp, ffmpeg)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip (updates automatically)
RUN pip3 install --no-cache-dir --upgrade yt-dlp

# Copy yt-dlp binary to expected location (if custom binary provided)
COPY --from=builder /app/yt-dlp ./yt-dlp/

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4000) + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Expose port
EXPOSE 4000

# Start server
CMD ["node", "dist/server.js"]
