import { type Response } from "express"
import { db } from "../config/db.ts"
import { type AuthenticatedRequest } from "../middlewares/auth.middleware.ts"

export async function getMyMatches(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.uid) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  try {
    const matches = await db`
      SELECT
        m.id,
        m.room_id,
        m.topic,
        m.difficulty,
        m.question_count,
        m.quiz_snapshot,
        m.started_at,
        m.ended_at,
        mp.score,
        mp.position,
        w.display_name AS winner_name
      FROM match_participants mp
      INNER JOIN matches m ON m.id = mp.match_id
      INNER JOIN users u ON u.id = mp.user_id
      LEFT JOIN users w ON w.id = m.winner_id
      WHERE u.firebase_uid = ${req.user.uid}
      ORDER BY m.ended_at DESC NULLS LAST, m.started_at DESC
      LIMIT 50
    `
    res.json({ matches })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}
