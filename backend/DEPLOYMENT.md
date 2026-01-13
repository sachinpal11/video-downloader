# 🚀 Ultra-Fast Video Downloader - Deployment Guide

## Overview

This is a production-ready, ultra-fast multi-platform video downloading backend built for **1-2 second response times** and **100K-1M monthly API hits**.

### Key Features

✅ **yt-dlp Warm Daemon** - Zero cold starts  
✅ **Multi-Layer Caching** - LRU + NodeCache + Redis (Upstash)  
✅ **Cloudflare CDN Ready** - Optimized cache headers  
✅ **Horizontal Scaling** - Stateless design  
✅ **1-2 Second Response** - Sub-second cached responses  
✅ **Multi-Platform Support** - YouTube, TikTok, Instagram, etc.  
✅ **Production Security** - Rate limiting, DMCA compliance, request IDs  

---

## 📋 Prerequisites

- Node.js 20+
- Docker (for containerized deployment)
- Redis/Upstash account (optional, for distributed caching)
- Fly.io account (for deployment)
- Domain with Cloudflare (optional, for CDN)

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Cloudflare CDN │  ← Public caching (1 hour)
└────────┬────────┘
         │
┌────────▼────────┐
│   Fly.io App    │  ← Horizontal scaling
└────────┬────────┘
         │
┌────────▼────────┐
│  Express API    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼─────┐
│  LRU  │ │ Node   │  ← In-memory (15 min)
│ Cache │ │ Cache  │
└───────┘ └──┬─────┘
             │
      ┌──────▼──────┐
      │   Redis     │  ← Distributed (1-12 hours)
      │  (Upstash)  │
      └─────────────┘
```

---

## 🔧 Local Development Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Redis (Upstash) - Optional but recommended
REDIS_URL=https://your-redis-url.upstash.io
REDIS_TOKEN=your-redis-token

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_RATE_LIMIT=true

# CORS
CORS_ORIGIN=*

# Cache Configuration
CACHE_TTL=3600
```

### 3. Install yt-dlp

#### Option A: Via pip (Recommended)
```bash
pip3 install yt-dlp
```

#### Option B: Static Binary
Download from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases) and place in `backend/yt-dlp/`:

```bash
# Linux
wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -O yt-dlp/yt-dlp
chmod +x yt-dlp/yt-dlp

# macOS
wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -O yt-dlp/yt-dlp
chmod +x yt-dlp/yt-dlp

# Windows
# Download yt-dlp.exe and place in yt-dlp/
```

### 4. Build & Run

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

### 5. Test Health Endpoint

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "daemon": {
    "warm": true,
    "binary": "yt-dlp"
  },
  "cache": {
    "lru": 0,
    "nodeCache": 0,
    "redis": "connected"
  }
}
```

---

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t video-downloader-backend .
```

### Run Container

```bash
docker run -d \
  -p 4000:4000 \
  -e PORT=4000 \
  -e REDIS_URL=your-redis-url \
  -e REDIS_TOKEN=your-redis-token \
  --name video-downloader \
  video-downloader-backend
```

### Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - NODE_ENV=production
      - REDIS_URL=${REDIS_URL}
      - REDIS_TOKEN=${REDIS_TOKEN}
      - ENABLE_RATE_LIMIT=true
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run:
```bash
docker-compose up -d
```

---

## ☁️ Fly.io Deployment

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux/Windows
curl -L https://fly.io/install.sh | sh
```

### 2. Login & Create App

```bash
fly auth login
fly launch
```

This will:
- Create a `fly.toml` (already exists, but will be updated)
- Deploy your app
- Set up DNS

### 3. Set Environment Variables

```bash
fly secrets set REDIS_URL=your-redis-url
fly secrets set REDIS_TOKEN=your-redis-token
fly secrets set ENABLE_RATE_LIMIT=true
fly secrets set CORS_ORIGIN=https://yourdomain.com
```

### 4. Deploy

```bash
fly deploy
```

### 5. Monitor

```bash
fly logs
fly status
fly dashboard
```

---

## ☁️ Cloudflare Setup (CDN)

### 1. Add DNS Record

1. Go to Cloudflare Dashboard → DNS
2. Add A/CNAME record pointing to your Fly.io app
3. Enable Proxy (orange cloud)

### 2. Configure Caching Rules

Go to **Rules** → **Page Rules**:

```
URL Pattern: *yourdomain.com/info*
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 1 hour
  - Browser Cache TTL: 15 minutes

URL Pattern: *yourdomain.com/download*
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 4 hours
  - Browser Cache TTL: 1 hour

URL Pattern: *yourdomain.com/multi*
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 1 hour
  - Browser Cache TTL: 15 minutes
```

### 3. Enable Compression

Go to **Speed** → **Optimization**:
- Enable Brotli compression
- Enable Auto Minify

### 4. Enable Firewall Rules (Optional)

Go to **Security** → **WAF**:
- Rate limiting rules
- IP filtering

---

## 📊 Redis/Upstash Setup

### Create Upstash Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Update Environment Variables

```env
REDIS_URL=your-upstash-url
REDIS_TOKEN=your-upstash-token
```

### Verify Connection

The app will automatically connect to Redis on startup. Check logs:

```
✅ Redis cache initialized
```

---

## 🔒 Security Configuration

### Rate Limiting

Enable in `.env`:

```env
ENABLE_RATE_LIMIT=true
RATE_LIMIT_WINDOW_MS=60000      # 1 minute
RATE_LIMIT_MAX_REQUESTS=100     # 100 requests per minute
```

### CORS

Configure allowed origins:

```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### Request IDs

Every request automatically gets a unique `X-Request-ID` header for tracking and DMCA compliance.

---

## 📈 Performance Optimization

### 1. Warm Daemon

The daemon automatically:
- Pre-warms on startup
- Re-warms every 2 minutes if inactive
- Pre-caches extractor data

**Expected Response Times:**
- Cached: **50-200ms** (LRU cache hit)
- Redis hit: **100-300ms**
- Fresh fetch: **1-2 seconds**

### 2. Cache Strategy

```
Layer 1: LRU Cache (In-Memory)
  - Size: 1000 entries
  - TTL: 15 minutes
  - Access: < 1ms

Layer 2: NodeCache (In-Memory)
  - Size: Unlimited (memory-bound)
  - TTL: 1 hour
  - Access: < 5ms

Layer 3: Redis (Distributed)
  - Size: Unlimited
  - TTL: 1-12 hours
  - Access: 50-200ms

Layer 4: Cloudflare CDN (Public)
  - TTL: 1 hour (info), 4 hours (download)
  - Access: < 100ms (edge cache)
```

### 3. Horizontal Scaling

The app is **stateless** and can scale horizontally:

```bash
# Fly.io auto-scaling
fly scale count 3

# Or Docker Swarm
docker service scale video-downloader=3
```

---

## 🧪 Testing

### Test Info Endpoint

```bash
curl "http://localhost:4000/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### Test Download Endpoint

```bash
curl "http://localhost:4000/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&itag=137"
```

### Test Multi Endpoint

```bash
curl "http://localhost:4000/multi?url=https://www.instagram.com/p/ABC123/"
```

### Test Health

```bash
curl http://localhost:4000/health
```

---

## 📊 Monitoring

### Health Check

The `/health` endpoint returns:

```json
{
  "status": "ok",
  "daemon": {
    "warm": true,
    "binary": "yt-dlp"
  },
  "cache": {
    "lru": 150,
    "nodeCache": 500,
    "redis": "connected"
  },
  "uptime": 3600
}
```

### Logs

All requests are logged with:
- Request ID
- Response time
- Cache status

### Metrics (Optional)

Integrate with:
- **Datadog** - APM monitoring
- **Sentry** - Error tracking
- **Prometheus** - Metrics collection

---

## 🐛 Troubleshooting

### yt-dlp Not Found

**Problem:** `yt-dlp: command not found`

**Solution:**
1. Install via pip: `pip3 install yt-dlp`
2. Or add binary to `yt-dlp/` directory
3. Verify with: `yt-dlp --version`

### Redis Connection Failed

**Problem:** `Redis initialization failed`

**Solution:**
1. Check `REDIS_URL` and `REDIS_TOKEN` in `.env`
2. Verify Upstash database is active
3. App will fall back to in-memory cache

### Slow Response Times

**Problem:** Responses > 2 seconds

**Solution:**
1. Enable Redis caching
2. Enable Cloudflare CDN
3. Increase LRU cache size
4. Check daemon warm status: `/health`

### Rate Limit Issues

**Problem:** `429 Too Many Requests`

**Solution:**
1. Increase `RATE_LIMIT_MAX_REQUESTS` in `.env`
2. Or disable: `ENABLE_RATE_LIMIT=false`
3. Check Redis connection (rate limits use Redis)

---

## 🚀 Production Checklist

- [ ] Environment variables configured
- [ ] Redis/Upstash database set up
- [ ] Docker image built and tested
- [ ] Fly.io app deployed
- [ ] Cloudflare CDN configured
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Health checks passing
- [ ] Monitoring set up
- [ ] Logs configured
- [ ] Domain SSL configured

---

## 📝 API Documentation

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "daemon": { "warm": true },
  "cache": { "lru": 0, "redis": "connected" }
}
```

### `GET /info?url=<video_url>`

Get video information and available qualities.

**Response:**
```json
{
  "status": "ok",
  "platform": "youtube",
  "title": "Video Title",
  "thumbnail": "https://...",
  "channel": "Channel Name",
  "duration": 120,
  "qualities": [
    { "itag": "137", "quality": "1080p", "size": 50000000 },
    { "itag": "136", "quality": "720p", "size": 30000000 }
  ],
  "cached": true,
  "responseTime": 50
}
```

### `GET /download?url=<video_url>&itag=<itag>`

Get direct download URL for specific quality.

**Response:**
```json
{
  "status": "ok",
  "downloadUrl": "https://googlevideo.com/...",
  "cached": false,
  "responseTime": 1200
}
```

### `GET /multi?url=<video_url>`

Get download URLs for multiple items (playlists, carousels, etc.).

**Response:**
```json
{
  "status": "ok",
  "platform": "instagram",
  "items": [
    {
      "title": "Item 1",
      "thumbnail": "https://...",
      "downloadUrl": "https://...",
      "qualities": [...]
    }
  ]
}
```

---

## 🔄 Updates & Maintenance

### Update yt-dlp

The Dockerfile installs yt-dlp via pip, so it updates automatically on rebuild:

```bash
docker build --no-cache -t video-downloader-backend .
docker-compose up -d --force-recreate
```

### Update Dependencies

```bash
npm update
npm audit fix
npm run build
fly deploy  # or docker-compose up -d
```

### Clear Cache

```bash
# Clear all caches (requires Redis CLI)
redis-cli FLUSHALL
```

---

## 📚 Additional Resources

- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [Fly.io Docs](https://fly.io/docs/)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Cloudflare CDN Docs](https://developers.cloudflare.com/cache/)

---

## 🆘 Support

For issues or questions:
1. Check logs: `fly logs` or `docker logs`
2. Check health: `GET /health`
3. Verify environment variables
4. Check Redis connection
5. Verify yt-dlp installation

---

**Built with ❤️ for ultra-fast video downloads**
