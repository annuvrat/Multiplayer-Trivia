import { type Request, type Response } from "express"
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
} from "../services/room.service.ts"
import { goToNextQuestion } from "../utils/gameEngine.ts"
import { Server, Socket } from "socket.io"
import { persistMatchResultAsync } from "../services/persistence.service.ts"
import { type AuthenticatedRequest } from "../middlewares/auth.middleware.ts"

export const createRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    const room = await createRoomService(req.user.uid)
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
    io.to(roomId).emit("player_joined", { userId, avatar })

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
    io.to(roomId).emit("player_left", { userId })

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

    // 1. Emit Game Started
    io.to(roomId as string).emit("game_started", { roomId })

    // 2. Emit First Question
    const firstQuestion = result.questions[0]
    io.to(roomId as string).emit("new_question", {
      question: firstQuestion,
      index: 0,
      totalQuestions: result.questions.length
    })

    // 3. Start Timer for the next question (30s)
    setTimeout(() => {
      goToNextQuestion(roomId as string, io)
    }, 30000)

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
    io.to(roomId as string).emit("return_to_lobby", { roomId })

    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}