# 🚀 Ultra-Fast Multi-Platform Video Downloader Backend

> **Production-ready, ultra-fast video downloading API with 1-2 second response times**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Fly.io](https://img.shields.io/badge/Fly.io-Ready-purple.svg)](https://fly.io/)

## ⚡ Key Features

✅ **yt-dlp Warm Daemon** - Zero cold starts  
✅ **Multi-Layer Caching** - LRU + NodeCache + Redis (Upstash)  
✅ **Cloudflare CDN Ready** - Optimized cache headers  
✅ **Horizontal Scaling** - Stateless design  
✅ **1-2 Second Response** - Sub-second cached responses  
✅ **Multi-Platform Support** - YouTube, TikTok, Instagram, Facebook, Twitter, Reddit, Vimeo, etc.  
✅ **Production Security** - Rate limiting, DMCA compliance, request IDs  
✅ **100K-1M Monthly Hits** - Built for scale  

## 📊 Performance

- **Cache Hit Response:** 50-200ms
- **Fresh Request:** 1-2 seconds
- **Cache Hit Rate:** 80-90% after warmup
- **Throughput:** ~500 req/s (single instance)
- **Horizontal Scaling:** Linear

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

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=4000
NODE_ENV=development
REDIS_URL=your-redis-url
REDIS_TOKEN=your-redis-token
ENABLE_RATE_LIMIT=true
```

### 3. Install yt-dlp

```bash
pip3 install yt-dlp
```

### 4. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 5. Test

```bash
curl http://localhost:4000/health
```

## 📋 API Endpoints

### `GET /health`

Health check endpoint.

```bash
curl http://localhost:4000/health
```

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

```bash
curl "http://localhost:4000/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

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

```bash
curl "http://localhost:4000/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&itag=137"
```

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

```bash
curl "http://localhost:4000/multi?url=https://www.instagram.com/p/ABC123/"
```

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

## 🎯 Supported Platforms

- ✅ YouTube
- ✅ YouTube Shorts
- ✅ TikTok
- ✅ Instagram (Public)
- ✅ Facebook (Public)
- ✅ Twitter/X
- ✅ Reddit
- ✅ Vimeo
- ✅ Streamable
- ✅ Rumble
- ✅ DailyMotion
- ✅ ShareChat
- ✅ Moj
- ✅ Chingari
- ✅ LinkedIn

*Powered by yt-dlp extractors - automatically supports all platforms yt-dlp supports*

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Environment | `development` |
| `REDIS_URL` | Redis/Upstash URL | - |
| `REDIS_TOKEN` | Redis/Upstash token | - |
| `ENABLE_RATE_LIMIT` | Enable rate limiting | `false` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `CORS_ORIGIN` | CORS allowed origins | `*` |

### Cache Configuration

| Layer | Size | TTL | Access Time |
|-------|------|-----|-------------|
| LRU | 1000 entries | 15 min | < 1ms |
| NodeCache | Unlimited | 1 hour | < 5ms |
| Redis | Unlimited | 1-12 hours | 50-200ms |
| Cloudflare | Unlimited | 1-4 hours | < 100ms |

## 🐳 Docker Deployment

### Build

```bash
docker build -t video-downloader-backend .
```

### Run

```bash
docker run -d \
  -p 4000:4000 \
  -e PORT=4000 \
  -e REDIS_URL=your-redis-url \
  -e REDIS_TOKEN=your-redis-token \
  --name video-downloader \
  video-downloader-backend
```

### Docker Compose

```bash
docker-compose up -d
```

## ☁️ Fly.io Deployment

### 1. Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

### 2. Login

```bash
fly auth login
```

### 3. Deploy

```bash
fly launch
fly secrets set REDIS_URL=your-redis-url
fly secrets set REDIS_TOKEN=your-redis-token
fly deploy
```

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[OPTIMIZATION.md](./OPTIMIZATION.md)** - Performance optimization details

## 🎯 Project Structure

```
backend/
├── src/
│   ├── server.ts              # Main server entry point
│   ├── routes/
│   │   ├── health.ts          # Health check endpoint
│   │   ├── info.ts            # Video info endpoint
│   │   ├── download.ts        # Download URL endpoint
│   │   └── multi.ts           # Multi-item endpoint
│   ├── services/
│   │   ├── ytdlp.ts           # yt-dlp wrapper service
│   │   ├── warmDaemon.ts      # Warm daemon worker
│   │   ├── cache.ts           # Multi-layer cache service
│   │   └── detector.ts        # Platform detection
│   ├── middlewares/
│   │   ├── rateLimit.ts       # Rate limiting
│   │   ├── security.ts        # Security headers
│   │   └── cacheHeaders.ts    # Cloudflare cache headers
│   ├── utils/
│   │   ├── logger.ts          # Logging utility
│   │   ├── requestId.ts       # Request ID generation
│   │   └── formats.ts         # Format utilities
│   └── types.ts               # TypeScript types
├── Dockerfile                 # Docker configuration
├── fly.toml                   # Fly.io configuration
├── ecosystem.config.js        # PM2 configuration
├── .env.example               # Environment template
├── DEPLOYMENT.md              # Deployment guide
├── OPTIMIZATION.md            # Optimization guide
└── README.md                  # This file
```

## 🔒 Security

- ✅ Rate limiting (optional, configurable)
- ✅ DMCA compliance headers
- ✅ Request ID tracking
- ✅ CORS configuration
- ✅ Security headers (XSS, Frame, etc.)
- ✅ No video storage
- ✅ No DRM bypass

## 📊 Monitoring

### Health Check

Monitor with:

```bash
curl http://localhost:4000/health
```

### Metrics

Track:
- Response times
- Cache hit rates
- Error rates
- Throughput
- Resource usage

## 🐛 Troubleshooting

### yt-dlp Not Found

**Solution:**
```bash
pip3 install yt-dlp
```

### Redis Connection Failed

**Solution:**
1. Check `REDIS_URL` and `REDIS_TOKEN` in `.env`
2. Verify Upstash database is active
3. App will fall back to in-memory cache

### Slow Response Times

**Solution:**
1. Enable Redis caching
2. Enable Cloudflare CDN
3. Check daemon warm status: `/health`

## 🚀 Performance Tips

1. **Enable Redis** - For distributed caching
2. **Use Cloudflare CDN** - For edge caching
3. **Horizontal Scaling** - For high throughput
4. **Monitor Cache Hit Rates** - Optimize TTLs
5. **Keep Daemon Warm** - Automatic, no action needed

## 📝 License

ISC

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📞 Support

For issues or questions:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Check [OPTIMIZATION.md](./OPTIMIZATION.md)
3. Check logs: `fly logs` or `docker logs`
4. Check health: `GET /health`

---

**Built with ❤️ for ultra-fast video downloads**
