import redis from "../config/redis.ts"
import type { Server } from "socket.io"
import { v4 as uuid } from "uuid"
import { generateQuestions } from "./gemini.service.ts"
import { refreshRoomTtl } from "./roomTtl.ts"
import { broadcastGameStart } from "../utils/gameBroadcast.ts"

/** Free-for-all (default) vs team deathmatch — stored on the room for clients & future scoring. */
const VALID_GAME_MODES = new Set(["ffa", "tdm"])

export const teamAssignKey = (roomId: string) => `room:${roomId.toLowerCase()}:team_assign`

const MAX_TEAM_NAME_LEN = 36

export const createRoomService = async (hostUserId: string, gameModeRaw?: string) => {
  const gameMode = VALID_GAME_MODES.has(String(gameModeRaw || "").toLowerCase())
    ? String(gameModeRaw).toLowerCase()
    : "ffa"
  const roomId = uuid().slice(0, 6).toLowerCase()
  const roomKey = `room:${roomId}`

  await redis.hset(roomKey, {
    status: "waiting",
    roomId,
    host: hostUserId,
    maxPlayers: "10",
    gameMode,
    teamAName: "Sapphire",
    teamBName: "Crimson",
  })
  await refreshRoomTtl(roomId)
  return { roomId, gameMode }
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

  await refreshRoomTtl(id)
  const teams = await getTeamsPayload(id)
  return { roomId: id, players: fullPlayers, teams }
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

  const teams = await getTeamsPayload(id)

  return {
    roomId: metadata.roomId,
    host: metadata.host,
    gameMode: teams.gameMode,
    status,
    maxPlayers: Number.parseInt(metadata.maxPlayers as string),
    players: fullPlayers,
    currentQuestion,
    currentQuestionIndex,
    teams,
  }
}

export const leaveRoomService = async (roomId: string, userId: string) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const playersKey = `room:${id}:players`
  const avatarsKey = `room:${id}:avatars`
  const assignKey = teamAssignKey(id)

  await redis.srem(playersKey, userId)
  await redis.hdel(avatarsKey, userId)
  await redis.hdel(assignKey, userId)

  const players = await redis.smembers(playersKey)

  if (players.length === 0) {
    await redis.del(roomKey, playersKey, avatarsKey, assignKey)
    return { players: [] }
  }

  const host = await redis.hget(roomKey, "host")
  if (host === userId) {
    const nextHost = players[0]
    await redis.hset(roomKey, "host", nextHost as string)
  }

  await refreshRoomTtl(id)
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
  requesterUserId: string,
) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const questionsKey = `room:${id}:questions`

  const metadata = await redis.hgetall(roomKey)
  if (Object.keys(metadata).length === 0) throw new Error("Room not found")
  if (metadata.host !== requesterUserId) throw new Error("Only host can generate test")

  const questions = await generateQuestions(topic, difficulty, questionCount)
  await Promise.all([
    redis.set(questionsKey, JSON.stringify(questions)),
    redis.hset(roomKey, {
      topic,
      difficulty,
      questionCount: String(questionCount),
    }),
  ])
  await refreshRoomTtl(id)

  return { message: "Test generated", questions }
}

export const startGameService = async (
  roomId: string,
  userId: string,
  opts?: { allowTdmDirectStart?: boolean },
) => {
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

  const gm =
    metadata.gameMode && VALID_GAME_MODES.has(String(metadata.gameMode))
      ? String(metadata.gameMode)
      : "ffa"
  if (gm === "tdm" && !opts?.allowTdmDirectStart) {
    throw new Error("Team matches use the 10-second countdown. Use Start match in the lobby.")
  }

  if (gm === "tdm") {
    const assign = await redis.hgetall(teamAssignKey(id))
    for (const p of players) {
      const t = assign[p]
      if (t !== "a" && t !== "b") {
        throw new Error("Every player must pick Sapphire or Crimson before starting.")
      }
    }
    const aCount = players.filter((p) => assign[p] === "a").length
    const bCount = players.filter((p) => assign[p] === "b").length
    if (aCount < 1 || bCount < 1) throw new Error("Each team needs at least one player.")
  }

  const questions = JSON.parse(questionsRaw)
  await redis.hset(roomKey, { status: "playing" })
  await redis.hdel(roomKey, "countdownEndsAt")
  await redis.hset(gameKey, {
    currentQuestionIndex: 0,
    status: "playing",
    startedAt: new Date().toISOString(),
  })

  const pipeline = redis.pipeline()
  for (const player of players) pipeline.zadd(leaderboardKey, 0, player)
  await pipeline.exec()
  await refreshRoomTtl(id)

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
  await refreshRoomTtl(id)

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

export const endGameService = async (roomId: string, requesterUserId?: string) => {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const metadata = await redis.hgetall(roomKey)

  if (Object.keys(metadata).length === 0) throw new Error("Room not found")
  if (requesterUserId && metadata.host !== requesterUserId) throw new Error("Only host can end the game")

  const leaderboard = await getLeaderboardService(id)

  await redis.hset(roomKey, "status", "finished")
  await refreshRoomTtl(id)
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
  await redis.hdel(roomKey, "countdownEndsAt")

  // Clear game state, leaderboard, and answers for a fresh start
  await redis.del(gameKey, leaderboardKey, answersKey)
  await refreshRoomTtl(id)

  return { message: "Room reset to lobby" }
}

export async function getTeamsPayload(roomId: string) {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const playersKey = `room:${id}:players`
  const [metadata, players, assign] = await Promise.all([
    redis.hgetall(roomKey),
    redis.smembers(playersKey),
    redis.hgetall(teamAssignKey(id)),
  ])
  if (Object.keys(metadata).length === 0) {
    return {
      gameMode: "ffa" as const,
      teamAName: "Sapphire",
      teamBName: "Crimson",
      teamA: [] as string[],
      teamB: [] as string[],
      unassigned: [] as string[],
      countdownEndsAt: null as string | null,
    }
  }
  const gameMode =
    metadata.gameMode && VALID_GAME_MODES.has(String(metadata.gameMode))
      ? String(metadata.gameMode)
      : "ffa"
  let teamAName = (metadata.teamAName || "Sapphire").trim() || "Sapphire"
  let teamBName = (metadata.teamBName || "Crimson").trim() || "Crimson"
  teamAName = teamAName.slice(0, MAX_TEAM_NAME_LEN)
  teamBName = teamBName.slice(0, MAX_TEAM_NAME_LEN)
  const teamA: string[] = []
  const teamB: string[] = []
  const unassigned: string[] = []
  for (const uid of [...players].sort()) {
    const t = assign[uid]
    if (t === "a") teamA.push(uid)
    else if (t === "b") teamB.push(uid)
    else unassigned.push(uid)
  }
  const countdownEndsAt = metadata.countdownEndsAt || null
  return { gameMode, teamAName, teamBName, teamA, teamB, unassigned, countdownEndsAt }
}

function sanitizeTeamName(raw: string, fallback: string) {
  const t = raw.trim().slice(0, MAX_TEAM_NAME_LEN)
  return t.length > 0 ? t : fallback
}

export async function setPlayerTeamService(roomId: string, userId: string, team: "a" | "b") {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const playersKey = `room:${id}:players`
  const metadata = await redis.hgetall(roomKey)
  if (Object.keys(metadata).length === 0) throw new Error("Room not found")
  const gm =
    metadata.gameMode && VALID_GAME_MODES.has(String(metadata.gameMode))
      ? String(metadata.gameMode)
      : "ffa"
  if (gm !== "tdm") throw new Error("Teams only apply to Team (TDM) arenas.")
  const inRoom = await redis.sismember(playersKey, userId)
  if (!inRoom) throw new Error("Join the room before picking a team.")
  await redis.hset(teamAssignKey(id), userId, team)
  await refreshRoomTtl(id)
  return getTeamsPayload(id)
}

export async function setTeamNamesService(
  roomId: string,
  hostUserId: string,
  teamAName: string,
  teamBName: string,
) {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const metadata = await redis.hgetall(roomKey)
  if (Object.keys(metadata).length === 0) throw new Error("Room not found")
  if (metadata.host !== hostUserId) throw new Error("Only the host can rename teams.")
  const gm =
    metadata.gameMode && VALID_GAME_MODES.has(String(metadata.gameMode))
      ? String(metadata.gameMode)
      : "ffa"
  if (gm !== "tdm") throw new Error("Team names apply to Team (TDM) arenas only.")
  const a = sanitizeTeamName(teamAName, "Sapphire")
  const b = sanitizeTeamName(teamBName, "Crimson")
  await redis.hset(roomKey, { teamAName: a, teamBName: b })
  await refreshRoomTtl(id)
  return getTeamsPayload(id)
}

export async function startLobbyCountdownService(roomId: string, hostUserId: string) {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const playersKey = `room:${id}:players`
  const questionsKey = `room:${id}:questions`
  const [metadata, players, questionsRaw] = await Promise.all([
    redis.hgetall(roomKey),
    redis.smembers(playersKey),
    redis.get(questionsKey),
  ])
  if (Object.keys(metadata).length === 0) throw new Error("Room not found")
  if (metadata.host !== hostUserId) throw new Error("Only the host can start the countdown.")
  const gm =
    metadata.gameMode && VALID_GAME_MODES.has(String(metadata.gameMode))
      ? String(metadata.gameMode)
      : "ffa"
  if (gm !== "tdm") throw new Error("Countdown start is only for Team (TDM) arenas.")
  if (players.length < 2) throw new Error("Minimum 2 players required to start.")
  if (!questionsRaw) throw new Error("Generate the quiz before starting.")
  const assign = await redis.hgetall(teamAssignKey(id))
  for (const p of players) {
    const t = assign[p]
    if (t !== "a" && t !== "b") {
      throw new Error("Everyone must join Sapphire or Crimson before starting.")
    }
  }
  const aCount = players.filter((p) => assign[p] === "a").length
  const bCount = players.filter((p) => assign[p] === "b").length
  if (aCount < 1 || bCount < 1) throw new Error("Each team needs at least one player.")

  const endsAt = new Date(Date.now() + 10_000).toISOString()
  await redis.hset(roomKey, { countdownEndsAt: endsAt })
  await refreshRoomTtl(id)
  return { endsAt, roomId: id }
}

export async function clearCountdownField(roomId: string) {
  const id = roomId.toLowerCase()
  await redis.hdel(`room:${id}`, "countdownEndsAt")
}

export async function finalizeGameStartAfterCountdown(roomId: string, io: Server, expectedEndsAt: string) {
  const id = roomId.toLowerCase()
  const roomKey = `room:${id}`
  const meta = await redis.hgetall(roomKey)
  if (Object.keys(meta).length === 0) return
  if (meta.status !== "waiting") return
  if ((meta.countdownEndsAt || "") !== expectedEndsAt) return

  const host = meta.host as string
  const result = await startGameService(id, host, { allowTdmDirectStart: true })
  broadcastGameStart(io, id, result.questions)
}

export async function emitTeamsToRoom(io: Server, roomId: string) {
  const payload = await getTeamsPayload(roomId)
  io.to(roomId).emit("teams_updated", payload)
}