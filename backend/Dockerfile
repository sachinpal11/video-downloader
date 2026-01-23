# ===============================
# BUILD STAGE
# ===============================
FROM node:20-slim AS builder

WORKDIR /app

# Copy configs
COPY package*.json tsconfig.json ./

# Install ALL deps (including dev for tsc)
RUN npm ci

# Copy source
COPY src ./src

# Build TS
RUN npm run build


# ===============================
# RUNTIME STAGE
# ===============================
FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    yt-dlp \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Verify yt-dlp is executable
RUN which yt-dlp && yt-dlp --version

# Copy runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Non-root user (Render friendly)
RUN useradd -m appuser
USER appuser

# Expose port
EXPOSE 4000

# Start server
CMD ["node", "dist/server.js"]
