import redis from "../config/redis.ts"
import { v4 as uuid } from "uuid"
import { generateQuestions } from "./groq.service.ts"

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

export const getRoomPlayersService = async (roomId: string) => {
  const playersKey = `room:${roomId}:players`
  const players = await redis.smembers(playersKey)
  return { players }
}

export const generateTestService = async (
  roomId: string,
  topic: string,
  difficulty: string,
  questionCount: number,
) => {
  const roomKey = `room:${roomId}`
  const questionsKey = `room:${roomId}:questions`

  const roomExists = await redis.exists(roomKey)
  if (!roomExists) throw new Error("Room not found")

  const questions = await generateQuestions(topic, difficulty, questionCount)
  await redis.set(questionsKey, JSON.stringify(questions))

  return { message: "Test generated", questions }
}

export const startGameService = async (roomId: string, userId: string) => {
  const roomKey = `room:${roomId}`
  const playersKey = `room:${roomId}:players`
  const leaderboardKey = `room:${roomId}:leaderboard`
  const timerKey = `room:${roomId}:timer`

  const [metadata, players] = await Promise.all([
    redis.hgetall(roomKey),
    redis.smembers(playersKey),
  ])

  if (Object.keys(metadata).length === 0) {
    throw new Error("Room not found")
  }

  if (metadata.host !== userId) {
    throw new Error("Only host can start the game")
  }

  if (players.length < 2) {
    throw new Error("Minimum 2 players required to start")
  }

  // Initialize status
  await redis.hset(roomKey, "status", "playing")

  // Initialize leaderboard
  const pipeline = redis.pipeline()
  for (const player of players) {
    pipeline.zadd(leaderboardKey, 0, player)
  }
  // Initialize timer (10 minutes)
  pipeline.set(timerKey, "started")
  pipeline.expire(timerKey, 600)

  await pipeline.exec()

  return {
    message: "Game started",
    roomId,
  }
}

export const submitAnswerService = async (
  roomId: string,
  userId: string,
  questionId: number,
  selectedOption: number,
) => {
  const questionsKey = `room:${roomId}:questions`
  const leaderboardKey = `room:${roomId}:leaderboard`
  const answersKey = `room:${roomId}:answers`

  const questionsRaw = await redis.get(questionsKey)
  if (!questionsRaw) throw new Error("Questions not found")

  const questions = JSON.parse(questionsRaw)
  const question = questions.find((q: any) => q.id === questionId)

  if (!question) throw new Error("Question not found")

  const isCorrect = question.answer === selectedOption
  const scoreChange = isCorrect ? 10 : 0

  if (isCorrect) {
    await redis.zincrby(leaderboardKey, scoreChange, userId)
  }

  // Store answer
  await redis.hset(answersKey, `${userId}:${questionId}`, selectedOption)

  return {
    correct: isCorrect,
    scoreChange,
    correctAnswer: question.answer,
  }
}

export const getLeaderboardService = async (roomId: string) => {
  const leaderboardKey = `room:${roomId}:leaderboard`
  const data = await redis.zrevrange(leaderboardKey, 0, -1, "WITHSCORES")

  const leaderboard = []
  for (let i = 0; i < data.length; i += 2) {
    leaderboard.push({
      user: data[i],
      score: Number.parseInt(data[i + 1]),
    })
  }

  return leaderboard
}

export const endGameService = async (roomId: string) => {
  const roomKey = `room:${roomId}`
  const leaderboard = await getLeaderboardService(roomId)

  await redis.hset(roomKey, "status", "finished")

  return {
    winner: leaderboard[0]?.user || null,
    leaderboard,
  }
}