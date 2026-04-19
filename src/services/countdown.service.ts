import type { Server } from "socket.io"
import { clearCountdownField, finalizeGameStartAfterCountdown } from "./room.service.ts"

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function clearLobbyCountdown(roomId: string) {
  const id = roomId.toLowerCase()
  const t = timers.get(id)
  if (t) {
    clearTimeout(t)
    timers.delete(id)
  }
}

/**
 * Schedules the actual game start when `countdownEndsAt` elapses.
 * Clears itself if the room cancels or starts early.
 */
export function scheduleLobbyCountdown(roomId: string, io: Server, expectedEndsAt: string) {
  const id = roomId.toLowerCase()
  clearLobbyCountdown(id)

  const endsMs = new Date(expectedEndsAt).getTime()
  const delay = Math.max(0, endsMs - Date.now())

  const handle = setTimeout(async () => {
    timers.delete(id)
    try {
      await finalizeGameStartAfterCountdown(id, io, expectedEndsAt)
    } catch (e) {
      console.error(`Countdown finalize failed for ${id}:`, e)
    }
  }, delay)

  timers.set(id, handle)
}

export function cancelLobbyCountdown(roomId: string, io: Server) {
  const id = roomId.toLowerCase()
  clearLobbyCountdown(id)
  void clearCountdownField(id)
  io.to(roomId).emit("countdown_cancelled", {})
}
