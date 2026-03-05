import { type Request, type Response } from "express"
import {
  createRoomService,
  joinRoomService,
  getRoomService,
  leaveRoomService,
  startGameService,
  getRoomPlayersService,
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