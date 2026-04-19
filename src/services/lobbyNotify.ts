import type { Server } from "socket.io"
import redis from "../config/redis.ts"
import { cancelLobbyCountdown } from "./countdown.service.ts"
import { emitTeamsToRoom } from "./room.service.ts"

/** Call after a player leaves via HTTP or socket so countdown cancels and team rosters sync. */
export async function afterPlayerLeftRoom(roomId: string, io: Server) {
  const id = roomId.toLowerCase()
  const hadCd = await redis.hget(`room:${id}`, "countdownEndsAt")
  if (hadCd) cancelLobbyCountdown(roomId, io)
  await emitTeamsToRoom(io, roomId)
}
