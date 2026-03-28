import { Server } from "socket.io"
import redis from "../config/redis.ts"
import { getLeaderboardService, endGameService } from "../services/room.service.ts"

export const goToNextQuestion = async (roomId: string, io: Server) => {
    const gameKey = `room:${roomId}:game`
    const questionsKey = `room:${roomId}:questions`

    try {
        // 1. Read current state
        const gameState = await redis.hgetall(gameKey)
        if (!gameState || gameState.status !== "playing") return

        let currentIndex = Number.parseInt(gameState.currentQuestionIndex || "0")
        currentIndex++

        // 2. Fetch questions to check if we reached the end
        const questionsRaw = await redis.get(questionsKey)
        if (!questionsRaw) return
        const questions = JSON.parse(questionsRaw)

        if (currentIndex >= questions.length) {
            // Game Finished
            const result = await endGameService(roomId)
            await redis.hset(gameKey, "status", "finished")

            io.to(roomId).emit("game_ended", result)
            console.log(`Game ended for room ${roomId}`)
            return
        }

        // 3. Update Redis with new index
        await redis.hset(gameKey, "currentQuestionIndex", currentIndex)

        // 4. Emit new question (STRIIPPING THE ANSWER FOR SECURITY)
        const fullQuestion = questions[currentIndex]
        const { answer, ...safeQuestion } = fullQuestion; // Remove 'answer' key

        io.to(roomId).emit("new_question", {
            question: safeQuestion,
            index: currentIndex,
            totalQuestions: questions.length
        })

        console.log(`Room ${roomId}: Moving to question ${currentIndex}`)

        // 5. Start next 30s timer recursively
        setTimeout(() => {
            goToNextQuestion(roomId, io)
        }, 30000)

    } catch (error) {
        console.error(`Error in game loop for room ${roomId}:`, error)
    }
}
