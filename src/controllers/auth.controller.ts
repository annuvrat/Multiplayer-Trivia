import { type Response } from "express"
import { type AuthenticatedRequest } from "../middlewares/auth.middleware.ts"
import { getFirebaseAdminAuth } from "../config/firebaseAdmin.ts"

export function getGoogleSession(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  res.json({
    message: "Firebase token verified",
    user: req.user,
  })
}

export function refreshGoogleSession(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  // With Firebase Auth, clients refresh ID tokens directly via SDK.
  // Backend confirms the currently supplied token is valid and returns user identity.
  res.json({
    message: "Token valid",
    user: req.user,
  })
}

export async function signOutGoogleSession(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  await getFirebaseAdminAuth().revokeRefreshTokens(req.user.uid)
  res.json({ message: "Signed out. Refresh tokens revoked.", uid: req.user.uid })
}
