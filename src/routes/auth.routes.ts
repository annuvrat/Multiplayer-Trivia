import { Router } from "express"
import {
  getGoogleSession,
  refreshGoogleSession,
  signOutGoogleSession,
} from "../controllers/auth.controller.ts"
import { requireFirebaseAuth } from "../middlewares/auth.middleware.ts"

const router = Router()

router.get("/google/session", requireFirebaseAuth, getGoogleSession)
router.post("/google/refresh", requireFirebaseAuth, refreshGoogleSession)
router.post("/google/signout", requireFirebaseAuth, signOutGoogleSession)

export default router
