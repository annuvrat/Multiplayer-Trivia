import redis from "../config/redis.ts"
import { v4 as uuid } from "uuid"
import { generateQuestions } from "./gemini.service.ts"

export const createRoomService = async () => {
  const roomId = uuid().slice(0, 6).toLowerCase()
  const roomKey = `room:${roomId}`

  await redis.hset(roomKey, {
    status: "waiting",
    roomId,
    maxPlayers: "10",
  })
  await redis.expire(roomKey, 86400)
  return { roomId }
}

export const joinRoomService = async (roomId: string, userId: string, avatar: string) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const playersKey = `room:${id}:players`
  const avatarsKey = `room:${id}:avatars`

  const roomExists = await redis.exists(roomKey)
  if (!roomExists) throw new Error("Room not found")

  const hostExists = await redis.hget(roomKey, "host")
  if (!hostExists) {
    await redis.hset(roomKey, "host", userId)
  }

  await redis.sadd(playersKey, userId)
  await redis.hset(avatarsKey, userId, avatar)

  const players = await redis.smembers(playersKey)
  const avatars = await redis.hgetall(avatarsKey)

  const fullPlayers = players.map(uid => ({
    userId: uid,
    avatar: avatars[uid] || ""
  }))

  return { roomId: id, players: fullPlayers }
}

export const getRoomService = async (roomId: string) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const playersKey = `room:${id}:players`
  const questionsKey = `room:${id}:questions`
  const gameKey = `room:${id}:game`
  const avatarsKey = `room:${id}:avatars`

  const [metadata, players, avatars, questionsRaw, gameState] = await Promise.all([
    redis.hgetall(roomKey),
    redis.smembers(playersKey),
    redis.hgetall(avatarsKey),
    redis.get(questionsKey),
    redis.hgetall(gameKey),
  ])

  if (Object.keys(metadata).length === 0) return null

  const status = metadata.status as "waiting" | "playing" | "finished"
  let currentQuestion = null
  let currentQuestionIndex = 0

  if (status === "playing" && questionsRaw && gameState) {
    const questions = JSON.parse(questionsRaw)
    currentQuestionIndex = Number.parseInt(gameState.currentQuestionIndex || "0")
    currentQuestion = questions[currentQuestionIndex]
  }

  const fullPlayers = players.map(uid => ({
    userId: uid,
    avatar: avatars[uid] || ""
  }))

  return {
    roomId: metadata.roomId,
    host: metadata.host,
    status,
    maxPlayers: Number.parseInt(metadata.maxPlayers as string),
    players: fullPlayers,
    currentQuestion,
    currentQuestionIndex,
  }
}

export const leaveRoomService = async (roomId: string, userId: string) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const playersKey = `room:${id}:players`
  const avatarsKey = `room:${id}:avatars`

  await redis.srem(playersKey, userId)
  await redis.hdel(avatarsKey, userId)

  const players = await redis.smembers(playersKey)

  if (players.length === 0) {
    await redis.del(roomKey, playersKey, avatarsKey)
    return { players: [] }
  }

  const host = await redis.hget(roomKey, "host")
  if (host === userId) {
    const nextHost = players[0]
    await redis.hset(roomKey, "host", nextHost as string)
  }

  return { players }
}

export const getRoomPlayersService = async (roomId: string) => {
  const id = roomId.toLowerCase()
  const playersKey = `room:${id}:players`
  const avatarsKey = `room:${id}:avatars`
  const [players, avatars] = await Promise.all([
    redis.smembers(playersKey),
    redis.hgetall(avatarsKey)
  ])

  const fullPlayers = players.map(uid => ({
    userId: uid,
    avatar: avatars[uid] || ""
  }))

  return { players: fullPlayers }
}

export const generateTestService = async (
  roomId: string,
  topic: string,
  difficulty: string,
  questionCount: number,
) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const questionsKey = `room:${id}:questions`

  if (!(await redis.exists(roomKey))) throw new Error("Room not found")

  const questions = await generateQuestions(topic, difficulty, questionCount)
  await redis.set(questionsKey, JSON.stringify(questions))

  return { message: "Test generated", questions }
}

export const startGameService = async (roomId: string, userId: string) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const playersKey = `room:${id}:players`
  const leaderboardKey = `room:${id}:leaderboard`
  const gameKey = `room:${id}:game`
  const questionsKey = `room:${id}:questions`

  const [metadata, players, questionsRaw] = await Promise.all([
    redis.hgetall(roomKey),
    redis.smembers(playersKey),
    redis.get(questionsKey),
  ])

  if (Object.keys(metadata).length === 0) throw new Error("Room not found")
  if (metadata.host !== userId) throw new Error("Only host can start the game")
  if (players.length < 2) throw new Error("Minimum 2 players required to start")
  if (!questionsRaw) throw new Error("No questions generated for this room")

  const questions = JSON.parse(questionsRaw)
  await redis.hset(roomKey, "status", "playing")
  await redis.hset(gameKey, { currentQuestionIndex: 0, status: "playing" })

  const pipeline = redis.pipeline()
  for (const player of players) pipeline.zadd(leaderboardKey, 0, player)
  await pipeline.exec()

  return { message: "Game started", roomId: id, questions }
}

export const submitAnswerService = async (
  roomId: string,
  userId: string,
  questionIndex: number,
  selectedOption: number,
) => {
  const id = roomId.toLowerCase()
  const gameKey = `room:${id}:game`
  const questionsKey = `room:${id}:questions`
  const leaderboardKey = `room:${id}:leaderboard`
  const answersKey = `room:${id}:answers`

  const [gameState, questionsRaw] = await Promise.all([
    redis.hgetall(gameKey),
    redis.get(questionsKey),
  ])

  if (!gameState || gameState.status !== "playing") throw new Error("Game is not in playing status")
  if (Number.parseInt(gameState.currentQuestionIndex || "0") !== questionIndex) throw new Error("Wrong question index")
  if (await redis.hexists(answersKey, `${userId}:${questionIndex}`)) throw new Error("Already answered")
  if (!questionsRaw) throw new Error("Questions not found")

  const questions = JSON.parse(questionsRaw)
  const question = questions[questionIndex]
  const isCorrect = question.answer === selectedOption

  if (isCorrect) await redis.zincrby(leaderboardKey, 10, userId)
  await redis.hset(answersKey, `${userId}:${questionIndex}`, selectedOption)

  return { correct: isCorrect, scoreChange: isCorrect ? 10 : 0, correctAnswer: question.answer || 0 }
}

export const getLeaderboardService = async (roomId: string) => {
  const id = roomId.toLowerCase()
  const leaderboardKey = `room:${id}:leaderboard`
  const data = await redis.zrevrange(leaderboardKey, 0, -1, "WITHSCORES")

  const leaderboard = []
  for (let i = 0; i < data.length; i += 2) {
    const user = data[i];
    const score = data[i + 1];
    if (user && score) {
      leaderboard.push({ user, score: Number.parseInt(score) })
    }
  }
  return leaderboard
}

export const endGameService = async (roomId: string) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const leaderboard = await getLeaderboardService(id)

  await redis.hset(roomKey, "status", "finished")
  const topScore = leaderboard[0]?.score || 0
  const winnersList = leaderboard.filter(p => p.score === topScore && topScore > 0).map(p => p.user)

  return {
    winner: winnersList.length > 1 ? `TIE: ${winnersList.join(" & ")}` : (winnersList[0] || "No one!"),
    leaderboard,
  }
}

export const restartRoomService = async (roomId: string, userId: string) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const gameKey = `room:${id}:game`
  const leaderboardKey = `room:${id}:leaderboard`
  const answersKey = `room:${id}:answers`

  const host = await redis.hget(roomKey, "host")
  if (host !== userId) throw new Error("Only host can restart the game")

  // Reset status to waiting
  await redis.hset(roomKey, "status", "waiting")

  // Clear game state, leaderboard, and answers for a fresh start
  await redis.del(gameKey, leaderboardKey, answersKey)

  return { message: "Room reset to lobby" }
}