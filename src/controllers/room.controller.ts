import { type Request, type Response } from "express"
import redis from "../config/redis.ts"
import {
  createRoomService,
  joinRoomService,
  getRoomService,
  leaveRoomService,
  startGameService,
  getRoomPlayersService,
  generateTestService,
  submitAnswerService,
  getLeaderboardService,
  endGameService,
  restartRoomService,
  setPlayerTeamService,
  setTeamNamesService,
  startLobbyCountdownService,
  emitTeamsToRoom,
} from "../services/room.service.ts"
import { broadcastGameStart } from "../utils/gameBroadcast.ts"
import { scheduleLobbyCountdown, cancelLobbyCountdown } from "../services/countdown.service.ts"
import { afterPlayerLeftRoom } from "../services/lobbyNotify.ts"
import type { Server } from "socket.io"
import { persistMatchResultAsync } from "../services/persistence.service.ts"
import { type AuthenticatedRequest } from "../middlewares/auth.middleware.ts"

export const createRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    const gameMode = (req.body as { gameMode?: string } | undefined)?.gameMode
    const room = await createRoomService(req.user.uid, gameMode)
    res.json(room)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const joinRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params
  const { userId, avatar } = req.body

  try {
    const result = await joinRoomService(roomId as string, userId as string, avatar as string)

    const io = req.app.get("io")
    io.to(roomId as string).emit("player_joined", { userId, avatar })
    await emitTeamsToRoom(io, roomId as string)

    res.json(result)
  } catch (error: any) {
    res.status(404).json({ error: error.message })
  }
}

export const getRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params

  try {
    const result = await getRoomService(roomId as string)
    if (!result) {
      res.status(404).json({ error: "Room not found" })
      return
    }
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const leaveRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params
  const { userId } = req.body

  try {
    const result = await leaveRoomService(roomId as string, userId)

    const io = req.app.get("io")
    io.to(roomId as string).emit("player_left", { userId })
    await afterPlayerLeftRoom(roomId as string, io)

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const startGame = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params

  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    const result = await startGameService(roomId as string, req.user.uid)

    const io: Server = req.app.get("io")
    broadcastGameStart(io, roomId as string, result.questions)

    res.json({ message: result.message, roomId: result.roomId })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const getRoomPlayers = async (req: Request, res: Response) => {
  const { roomId } = req.params

  try {
    const result = await getRoomPlayersService(roomId as string)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const generateTest = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params
  const { topic, difficulty, questionCount } = req.body

  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    const result = await generateTestService(
      roomId as string,
      topic,
      difficulty,
      questionCount,
      req.user.uid,
    )

    const io = req.app.get("io")
    io.to(roomId).emit("test_generated", { topic, difficulty, questionCount })

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const submitAnswer = async (req: Request, res: Response) => {
  const { roomId } = req.params
  const { userId, questionIndex, selectedOption } = req.body

  try {
    const result = await submitAnswerService(
      roomId as string,
      userId,
      questionIndex,
      selectedOption,
    )

    const leaderboard = await getLeaderboardService(roomId as string)
    const io: Server = req.app.get("io")

    // Emit leaderboard update to everyone
    io.to(roomId as string).emit("leaderboard_update", { leaderboard })

    // Emit answer update (optional, user answered)
    io.to(roomId as string).emit("answer_update", { userId })

    // Emit specific submission details (keep this for individual response)
    io.to(roomId as string).emit("answer_submitted", {
      userId,
      isCorrect: result.correct,
      leaderboard,
    })

    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const getLeaderboard = async (req: Request, res: Response) => {
  const { roomId } = req.params

  try {
    const result = await getLeaderboardService(roomId as string)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const endGame = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params

  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    const result = await endGameService(roomId as string, req.user.uid)

    persistMatchResultAsync({
      roomId: roomId as string,
      leaderboard: result.leaderboard,
    })

    const io = req.app.get("io")
    io.to(roomId as string).emit("game_ended", result)

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const restartRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params

  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    const result = await restartRoomService(roomId as string, req.user.uid)

    const io: Server = req.app.get("io")
    cancelLobbyCountdown(roomId as string, io)
    io.to(roomId as string).emit("return_to_lobby", { roomId })
    await emitTeamsToRoom(io, roomId as string)

    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const setPlayerTeam = async (req: Request, res: Response) => {
  const { roomId } = req.params
  const { userId, team } = req.body as { userId?: string; team?: string }

  try {
    if (!userId || (team !== "a" && team !== "b")) {
      res.status(400).json({ error: "userId and team (a or b) are required" })
      return
    }
    const teams = await setPlayerTeamService(roomId as string, userId, team)
    const io: Server = req.app.get("io")
    io.to(roomId as string).emit("teams_updated", teams)
    res.json({ teams })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const patchTeamNames = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params
  const { teamAName, teamBName } = req.body as { teamAName?: string; teamBName?: string }

  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    const teams = await setTeamNamesService(
      roomId as string,
      req.user.uid,
      teamAName ?? "",
      teamBName ?? "",
    )
    const io: Server = req.app.get("io")
    io.to(roomId as string).emit("teams_updated", teams)
    res.json({ teams })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const startLobbyCountdown = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params

  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    const { endsAt, roomId: rid } = await startLobbyCountdownService(roomId as string, req.user.uid)
    const io: Server = req.app.get("io")
    io.to(roomId as string).emit("countdown_started", { endsAt })
    await emitTeamsToRoom(io, roomId as string)
    scheduleLobbyCountdown(rid, io, endsAt)
    res.json({ endsAt })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const cancelLobbyCountdownHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params

  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    const id = (roomId as string).toLowerCase()
    const meta = await redis.hgetall(`room:${id}`)
    if (Object.keys(meta).length === 0) {
      res.status(404).json({ error: "Room not found" })
      return
    }
    if (meta.host !== req.user.uid) {
      res.status(403).json({ error: "Only the host can cancel the countdown" })
      return
    }
    const io: Server = req.app.get("io")
    cancelLobbyCountdown(roomId as string, io)
    await emitTeamsToRoom(io, roomId as string)
    res.json({ ok: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}