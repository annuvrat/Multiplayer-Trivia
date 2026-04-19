import type { Server } from "socket.io"
import { goToNextQuestion } from "./gameEngine.ts"

/** Emits game_started + first question (strips answer) and schedules the question loop. */
export function broadcastGameStart(io: Server, roomId: string, questions: unknown[]) {
  if (!questions?.length) return
  const fullQuestion = questions[0] as { answer?: number; [k: string]: unknown }
  const { answer: _a, ...safeQuestion } = fullQuestion
  io.to(roomId).emit("game_started", { roomId })
  io.to(roomId).emit("new_question", {
    question: safeQuestion,
    index: 0,
    totalQuestions: questions.length,
  })
  setTimeout(() => {
    goToNextQuestion(roomId, io)
  }, 30000)
}
