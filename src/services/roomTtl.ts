import redis from "../config/redis.ts"

/** Ephemeral room data TTL — refreshed on every room mutation so all keys age out together. */
export const ROOM_TTL_SECONDS = 86_400

const roomKeyIds = (roomId: string) => {
  const id = roomId.toLowerCase()
  return [
    `room:${id}`,
    `room:${id}:players`,
    `room:${id}:avatars`,
    `room:${id}:questions`,
    `room:${id}:game`,
    `room:${id}:leaderboard`,
    `room:${id}:answers`,
  ]
}

/**
 * Apply the same TTL to every Redis key used by a room.
 * Safe if a key does not exist yet (EXPIRE is a no-op).
 */
export async function refreshRoomTtl(roomId: string) {
  const keys = roomKeyIds(roomId)
  const pipeline = redis.pipeline()
  for (const key of keys) {
    pipeline.expire(key, ROOM_TTL_SECONDS)
  }
  await pipeline.exec()
}
