import { Router } from "express"
import {
    createRoom,
    joinRoom,
    getRoom,
    leaveRoom,
    startGame,
    getRoomPlayers,
    generateTest,
    submitAnswer,
    getLeaderboard,
    endGame,
    restartRoom,
    setPlayerTeam,
    patchTeamNames,
    startLobbyCountdown,
    cancelLobbyCountdownHandler,
} from "../controllers/room.controller.ts"
import { requireFirebaseAuth } from "../middlewares/auth.middleware.ts"

const router = Router()

router.post("/create", requireFirebaseAuth, createRoom)
router.post("/join/:roomId", joinRoom)
router.post("/:roomId/team", setPlayerTeam)
router.patch("/:roomId/team-names", requireFirebaseAuth, patchTeamNames)
router.post("/:roomId/start-countdown", requireFirebaseAuth, startLobbyCountdown)
router.post("/:roomId/cancel-countdown", requireFirebaseAuth, cancelLobbyCountdownHandler)
router.get("/:roomId", getRoom)
router.post("/:roomId/leave", leaveRoom)
router.post("/:roomId/start", requireFirebaseAuth, startGame)
router.get("/:roomId/players", getRoomPlayers)
router.post("/:roomId/generate-test", requireFirebaseAuth, generateTest)
router.post("/:roomId/answer", submitAnswer)
router.get("/:roomId/leaderboard", getLeaderboard)
router.post("/:roomId/end", requireFirebaseAuth, endGame)
router.post("/:roomId/restart", requireFirebaseAuth, restartRoom)

export default router