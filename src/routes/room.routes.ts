import { Router } from "express"
import { createRoom, joinRoom } from "../controllers/room.controller.ts"

const router = Router()

router.post("/create", createRoom)
router.post("/join/:roomId", joinRoom)

export default router