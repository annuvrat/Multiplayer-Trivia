import { type Request, type Response } from "express"
import { createRoomService, joinRoomService } from "../services/room.service.ts"

export const createRoom = async (_: Request, res: Response) => {
  const room = await createRoomService()

  res.json(room)
}

export const joinRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params
  const { userId } = req.body

  const result = await joinRoomService(roomId as string, userId as string)

  res.json(result)
}