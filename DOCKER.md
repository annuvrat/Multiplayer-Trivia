# Docker Deployment Guide

This setup containerizes your Quiz Arena backend with Valkey caching for cloud deployment. Since you're using **Neon for PostgreSQL**, you only need to containerize the backend and include Valkey for caching.

## Files Created

- **Dockerfile**: Multi-stage build for optimized backend image
- **docker-compose.yml**: Orchestrates backend and Valkey services
- **.dockerignore**: Reduces image size
- **.env.docker.example**: Template for environment variables

## Quick Start

### 1. Setup Environment Variables
```bash
cp .env.docker.example .env.docker
# Copy values from your existing .env file
nano .env.docker
```

Your `.env.docker` should contain:
- `DATABASE_URL` - from your Neon connection string
- `DIRECT_URL` - from your Neon connection string
- `REDIS_URL` - pointing to Valkey
- `FIREBASE_SERVICE_ACCOUNT_JSON` - your Firebase credentials
- API keys: `GEMINI_API_KEY`, `GROQ_API_KEY`, `DEEP_SEEK_API_KEY`, `OPENAI_API_KEY`

### 2. Build & Run Locally
```bash
docker-compose up --build
```

This starts:
- **Valkey** on `localhost:6379` (Redis cache)
- **Backend** on `localhost:5000`
- **PostgreSQL**: Connected to your Neon database (external)

### 3. Verify Services
```bash
# Check running containers
docker-compose ps

# View backend logs
docker-compose logs backend -f

# Test API
curl http://localhost:5000

# Test Valkey connection
docker-compose exec valkey valkey-cli ping
```

## Configuration

### Environment Variables from .env
The docker-compose reads directly from your `.env` file or `.env.docker`:

```yaml
DATABASE_URL: ${DATABASE_URL}        # Your Neon connection
REDIS_URL: ${REDIS_URL}              # Valkey (valkey:6379 in Docker)
FIREBASE_SERVICE_ACCOUNT_JSON: ${FIREBASE_SERVICE_ACCOUNT_JSON}
```

### For Docker Networking
- **Valkey hostname**: `valkey:6379` (automatically resolved in Docker network)
- **PostgreSQL**: External Neon database (uses your DATABASE_URL)

## Development vs Production

### Development (with file watching)
```bash
docker-compose up
```

### Production (without file watching)
Modify the Dockerfile's CMD:
```dockerfile
CMD ["bun", "src/server.ts"]  # No --watch
```

## Scaling to Cloud

### Docker Hub / Container Registry
```bash
# Build image
docker build -t your-username/quiz-arena-backend:latest .

# Push to registry
docker push your-username/quiz-arena-backend:latest
```

### Deploy to Cloud (Railway, Render, DigitalOcean, etc.)

Since you're already using Neon for PostgreSQL:
1. Deploy backend container to your chosen platform
2. Add a managed Valkey/Redis service (optional, can be separate)
3. Set environment variables in the cloud platform:
   - All values from your `.env.docker`
   - Update `REDIS_URL` to point to your cloud Redis service

### Example: Railway
```bash
# Use Railway CLI
railway link
railway up
```

### Example: Vercel Functions (with Upstash Redis)
1. Deploy backend as Docker container
2. Use Upstash for managed Redis
3. Set `REDIS_URL=redis://...@upstash...`

## Troubleshooting

### Database Connection Failed
```bash
# Test Neon connection locally
psql $DATABASE_URL

# Check backend logs
docker-compose logs backend | grep -i "database\|connection"
```

### Redis Connection Issues
```bash
# Test Valkey connection
docker-compose exec valkey valkey-cli ping

# Check if Valkey container is running
docker-compose ps valkey
```

### Port Already in Use
```bash
# Change ports in docker-compose.yml
# Example: Change backend port from 5000 to 5001
docker-compose down
# Edit docker-compose.yml
docker-compose up --build
```

### Build Issues
```bash
# Rebuild with no cache
docker-compose build --no-cache

# View build output
docker-compose build --progress=plain
```

## Production Security Checklist

- [ ] Keep `.env.docker` secrets secure (don't commit to git)
- [ ] Use Neon's SSL connection (already in your DATABASE_URL)
- [ ] Set `NODE_ENV=production`
- [ ] Remove `--watch` flag in Dockerfile
- [ ] Use managed Valkey/Redis (don't expose Redis port publicly)
- [ ] Enable SSL/TLS for Redis if using external service
- [ ] Set up proper CORS for your client domain
- [ ] Use secrets management in cloud platform (not .env files)
- [ ] Keep API keys secure (use cloud platform's secret management)

## Cleanup

```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: deletes Valkey data only)
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a
```

## Notes

- **Neon handles PostgreSQL**: No need to manage database in Docker
- **Valkey is stateless**: Can be recreated anytime (caching only)
- **Backend is stateless**: Can run multiple replicas for scaling
- **Docker Compose for local**: Use it for development and testing
- **Kubernetes ready**: Can convert to K8s manifests if needed
