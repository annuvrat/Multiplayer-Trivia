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
} from "../services/room.service.ts"
import { goToNextQuestion } from "../utils/gameEngine.ts"
import { Server, Socket } from "socket.io"

export const createRoom = async (_: Request, res: Response) => {
  try {
    const room = await createRoomService()
    res.json(room)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const joinRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params
  const { userId } = req.body

  try {
    const result = await joinRoomService(roomId as string, userId as string)

    const io = req.app.get("io")
    io.to(roomId).emit("player_joined", { userId })

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

export const startGame = async (req: Request, res: Response) => {
  const { roomId } = req.params
  const { userId } = req.body

  try {
    const result = await startGameService(roomId as string, userId)

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

export const generateTest = async (req: Request, res: Response) => {
  const { roomId } = req.params
  const { topic, difficulty, questionCount } = req.body

  try {
    const result = await generateTestService(
      roomId as string,
      topic,
      difficulty,
      questionCount,
    )

    const io = req.app.get("io")
    io.to(roomId).emit("test_generated", { topic, difficulty, questionCount })

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const submitAnswer = async (c:any) => {
  const { roomId } = c.params
  const { userId, questionIndex, selectedOption } = c.body

  try {
    const result = await submitAnswerService(
      roomId as string,
      userId,
      questionIndex,
      selectedOption,
    )

    const leaderboard = await getLeaderboardService(roomId as string)
    const io: Server = c.app.get("io")

    // Emit leaderboard update to everyone
    io.to(roomId).emit("leaderboard_update", { leaderboard })

    // Emit answer update (optional, user answered)
    io.to(roomId).emit("answer_update", { userId })

    // Emit specific submission details (keep this for individual response)
    io.to(roomId).emit("answer_submitted", {
      userId,
      isCorrect: result.correct,
      leaderboard,
    })

    c.json(result)
  } catch (error: any) {
    c.status(400).json({ error: error.message })
  }
}

export const getLeaderboard = async (c:any) => {
  const { roomId } = c.params

  try {
    const result = await getLeaderboardService(roomId as string)
    c.json(result)
  } catch (error: any) {
    c.status(500).json({ error: error.message })
  }
}

export const endGame = async (c:any) => {
  const { roomId } = c.params

  try {
    const result = await endGameService(roomId as string)

    const io = c.app.get("io")
    io.to(roomId).emit("game_ended", result)

    c.json(result)
  } catch (error: any) {
    c.status(500).json({ error: error.message })
  }
}