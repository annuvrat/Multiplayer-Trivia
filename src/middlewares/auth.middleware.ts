import { type NextFunction, type Request, type Response } from "express"
import { getFirebaseAdminAuth } from "../config/firebaseAdmin.ts"

export type AuthenticatedRequest = Request & {
  user?: {
    uid: string
    email?: string
    name?: string
    picture?: string
  }
}

function getBearerToken(headerValue?: string): string | null {
  if (!headerValue) return null
  const [scheme, token] = headerValue.split(" ")
  if (scheme !== "Bearer" || !token) return null
  return token
}

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = getBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: "Missing Bearer token" })
      return
    }

    const decoded = await getFirebaseAdminAuth().verifyIdToken(token)
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    }
    next()
  } catch (error: any) {
    res.status(401).json({ error: "Invalid or expired Firebase token", details: error.message })
  }
}
