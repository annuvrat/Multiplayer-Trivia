import redis from "../config/redis.ts"
import { v4 as uuid } from "uuid"

export const createRoomService = async () => {
  const roomId = uuid().slice(0, 6)
  const roomKey = `room:${roomId}`

  await redis.hset(roomKey, {
    status: "waiting",
    roomId,
    maxPlayers: "10", // Default max players
  })

  return {
    roomId,
  }
}

export const joinRoomService = async (roomId: string, userId: string) => {
  const roomKey = `room:${roomId}`
  const playersKey = `room:${roomId}:players`

  const roomExists = await redis.exists(roomKey)
  if (!roomExists) throw new Error("Room not found")

  // Check if host exists, if not, set this user as host
  const hostExists = await redis.hget(roomKey, "host")
  if (!hostExists) {
    await redis.hset(roomKey, "host", userId)
  }

  await redis.sadd(playersKey, userId)
  const players = await redis.smembers(playersKey)

  return { roomId, players }
}

export const getRoomService = async (roomId: string) => {
  const roomKey = `room:${roomId}`
  const playersKey = `room:${roomId}:players`

  const [metadata, players] = await Promise.all([
    redis.hgetall(roomKey),
    redis.smembers(playersKey),
  ])

  if (Object.keys(metadata).length === 0) {
    return null
  }

  return {
    roomId: metadata.roomId,
    host: metadata.host,
    status: metadata.status as "waiting" | "playing" | "finished",
    maxPlayers: Number.parseInt(metadata.maxPlayers as string),
    players,
  }
}

export const leaveRoomService = async (roomId: string, userId: string) => {
  const roomKey = `room:${roomId}`
  const playersKey = `room:${roomId}:players`

  await redis.srem(playersKey, userId)
  const players = await redis.smembers(playersKey)

  if (players.length === 0) {
    await redis.del(roomKey, playersKey)
    return { players: [] }
  }

  const host = await redis.hget(roomKey, "host")
  if (host === userId) {
    // Assign next player as host
    const nextHost = players[0]
    await redis.hset(roomKey, "host", nextHost as string)
  }

  return { players }
}

export const startGameService = async (roomId: string, userId: string) => {
  const roomKey = `room:${roomId}`
  const playersKey = `room:${roomId}:players`

  const [metadata, playerCount] = await Promise.all([
    redis.hgetall(roomKey),
    redis.scard(playersKey),
  ])

  if (Object.keys(metadata).length === 0) {
    throw new Error("Room not found")
  }

  if (metadata.host !== userId) {
    throw new Error("Only host can start the game")
  }

  if (playerCount < 2) {
    throw new Error("Minimum 2 players required to start")
  }

  await redis.hset(roomKey, "status", "playing")

  return {
    message: "Game started",
    roomId,
  }
}

export const getRoomPlayersService = async (roomId: string) => {
  const playersKey = `room:${roomId}:players`
  const players = await redis.smembers(playersKey)
  return { players }
}