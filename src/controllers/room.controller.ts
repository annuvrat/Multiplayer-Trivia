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
    res.json(result)
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
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const submitAnswer = async (req: Request, res: Response) => {
  const { roomId } = req.params
  const { userId, questionId, selectedOption } = req.body

  try {
    const result = await submitAnswerService(
      roomId as string,
      userId,
      questionId,
      selectedOption,
    )
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
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

export const endGame = async (req: Request, res: Response) => {
  const { roomId } = req.params

  try {
    const result = await endGameService(roomId as string)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}