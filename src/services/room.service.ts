import redis from "../config/redis.ts"
import { v4 as uuid } from "uuid"

export const createRoomService = async () => {

  const roomId = uuid().slice(0,6)

  await redis.hset(`room:${roomId}`, {
    status: "waiting"
  })
 
  return {
    roomId
  }
}

export const joinRoomService = async (roomId: string, userId: string) => {
  const roomKey = `room:${roomId}`
  const playersKey = `room:${roomId}:players`

  // Single round-trip: exists + sadd + smembers
  const results = await redis
    .pipeline()
    .exists(roomKey)
    .sadd(playersKey, userId)
    .smembers(playersKey)
    .exec()

  const existsResult = results?.[0]
  const playersResult = results?.[2]
  if (!results || !existsResult || !playersResult) throw new Error("Room not found")
  const [, exists] = existsResult
  const [, players] = playersResult

  if (exists === 0) {
    await redis.srem(playersKey, userId)
    throw new Error("Room not found")
  }

  return { roomId, players: players as string[] }
}