import { db } from "../config/db.ts"
import redis from "../config/redis.ts"

type AuthUserPayload = {
  uid: string
  email?: string
  name?: string
  picture?: string
}

type LeaderboardEntry = {
  user: string
  score: number
}

function runInBackground(taskName: string, task: () => Promise<void>) {
  setImmediate(() => {
    void task().catch((error) => {
      console.error(`[persistence:${taskName}]`, error)
    })
  })
}

async function upsertUserByFirebaseUid(firebaseUid: string, data: {
  email?: string
  displayName?: string
  avatarUrl?: string
}) {
  const rows = await db<{
    id: string
  }[]>`
    INSERT INTO users (firebase_uid, email, display_name, avatar_url)
    VALUES (${firebaseUid}, ${data.email ?? null}, ${data.displayName ?? null}, ${data.avatarUrl ?? null})
    ON CONFLICT (firebase_uid) DO UPDATE
      SET
        email = COALESCE(EXCLUDED.email, users.email),
        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        updated_at = NOW()
    RETURNING id
  `
  return rows[0]?.id
}

export function persistAuthUserAsync(user: AuthUserPayload) {
  runInBackground("auth-user-upsert", async () => {
    await upsertUserByFirebaseUid(user.uid, {
      email: user.email,
      displayName: user.name,
      avatarUrl: user.picture,
    })
  })
}

export function persistMatchResultAsync(params: {
  roomId: string
  leaderboard: LeaderboardEntry[]
}) {
  runInBackground("match-result", async () => {
    const roomId = params.roomId.toLowerCase()
    const roomKey = `room:${roomId}`
    const gameKey = `room:${roomId}:game`

    const questionsKey = `room:${roomId}:questions`
    const [roomMeta, gameMeta, questionsRaw] = await Promise.all([
      redis.hgetall(roomKey),
      redis.hgetall(gameKey),
      redis.get(questionsKey),
    ])

    const topic = roomMeta.topic || null
    const difficulty = roomMeta.difficulty || null
    const questionCount = roomMeta.questionCount ? Number.parseInt(roomMeta.questionCount) : null
    let quizSnapshot: unknown = null
    if (questionsRaw) {
      try {
        quizSnapshot = JSON.parse(questionsRaw)
      } catch {
        quizSnapshot = null
      }
    }
    const startedAt = gameMeta.startedAt ? new Date(gameMeta.startedAt) : new Date()
    const endedAt = new Date()

    const sorted = [...params.leaderboard].sort((a, b) => b.score - a.score)
    const winnerName = sorted[0]?.user || null

    await db.begin(async (tx) => {
      const userIdByName = new Map<string, string>()

      for (const entry of sorted) {
        const uid = `guest:${entry.user}`
        const rows = await tx<{ id: string }[]>`
          INSERT INTO users (firebase_uid, display_name)
          VALUES (${uid}, ${entry.user})
          ON CONFLICT (firebase_uid) DO UPDATE
            SET
              display_name = COALESCE(EXCLUDED.display_name, users.display_name),
              updated_at = NOW()
          RETURNING id
        `
        const userId = rows[0]?.id
        if (userId) userIdByName.set(entry.user, userId)
      }

      const winnerId = winnerName ? userIdByName.get(winnerName) ?? null : null

      const matchRows = await tx<{ id: string }[]>`
        INSERT INTO matches (
          room_id,
          topic,
          difficulty,
          question_count,
          quiz_snapshot,
          started_at,
          ended_at,
          winner_id
        )
        VALUES (
          ${roomId},
          ${topic},
          ${difficulty},
          ${questionCount},
          ${quizSnapshot === null ? null : tx.json(quizSnapshot as Parameters<typeof tx.json>[0])},
          ${startedAt},
          ${endedAt},
          ${winnerId}
        )
        RETURNING id
      `

      const matchId = matchRows[0]?.id
      if (!matchId) return

      for (let i = 0; i < sorted.length; i += 1) {
        const entry = sorted[i]
        const userId = userIdByName.get(entry.user)
        if (!userId) continue

        await tx`
          INSERT INTO match_participants (match_id, user_id, score, position)
          VALUES (${matchId}, ${userId}, ${entry.score}, ${i + 1})
          ON CONFLICT (match_id, user_id) DO UPDATE
            SET
              score = EXCLUDED.score,
              position = EXCLUDED.position
        `
      }
    })
  })
}
