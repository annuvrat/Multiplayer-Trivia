import { Router } from "express"
import {
    createRoom,
    joinRoom,
    getRoom,
    leaveRoom,
    startGame,
    getRoomPlayers,
} from "../controllers/room.controller.ts"

const router = Router()

router.post("/create", createRoom)
router.post("/join/:roomId", joinRoom)
router.get("/:roomId", getRoom)
router.post("/:roomId/leave", leaveRoom)
router.post("/:roomId/start", startGame)
router.get("/:roomId/players", getRoomPlayers)

export default router