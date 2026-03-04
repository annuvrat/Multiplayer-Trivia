import Redis from "ioredis"

// Use REDIS_URL for production (Railway). For local dev, use Redis on localhost
// or set REDIS_URL in .env to Railway's *public* Redis URL (not redis.railway.internal).
const redisUrl = process.env.REDIS_URL!
const redis = new Redis(redisUrl)



redis.on("connect", () => {
  console.log("Connected to Redis")
})

redis.on("error", (err) => {
  console.error("Redis error", err)
})

export default redis