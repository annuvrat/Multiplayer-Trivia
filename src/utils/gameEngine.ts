import { Server } from "socket.io"
import redis from "../config/redis.ts"
import { getLeaderboardService, endGameService } from "../services/room.service.ts"
import { persistMatchResultAsync } from "../services/persistence.service.ts"

/**
 * THE 10-SECOND GAME LOOP:
 * 1. Push New Question (10s)
 * 2. Push Mid-Round Leaderboard (5s)
 * 3. Repeat OR End
 */
export const goToNextQuestion = async (roomId: string, io: Server) => {
    const gameKey = `room:${roomId}:game`
    const questionsKey = `room:${roomId}:questions`

    try {
        const gameState = await redis.hgetall(gameKey)
        if (!gameState || gameState.status !== "playing") return

        let currentIndex = Number.parseInt(gameState.currentQuestionIndex || "0")
        currentIndex++

        const questionsRaw = await redis.get(questionsKey)
        if (!questionsRaw) return
        const questions = JSON.parse(questionsRaw)

        // GAME IS OVER
        if (currentIndex >= questions.length) {
            const result = await endGameService(roomId)
            persistMatchResultAsync({
                roomId,
                leaderboard: result.leaderboard,
            })
            await redis.hset(gameKey, "status", "finished")
            io.to(roomId).emit("game_ended", result)
            console.log(`Game ended for room ${roomId}`)
            return
        }

        // UPDATE STATE
        await redis.hset(gameKey, "currentQuestionIndex", currentIndex)

        // SEND NEW QUESTION (10s TIMER STARTS NOW)
        const fullQuestion = questions[currentIndex]
        const { answer, ...safeQuestion } = fullQuestion;

        io.to(roomId).emit("new_question", {
            question: safeQuestion,
            index: currentIndex,
            totalQuestions: questions.length
        })

        console.log(`Room ${roomId}: Moving to question ${currentIndex}`)

        // ⏱️ THE 10-SECOND QUESTION TIMER
        setTimeout(async () => {
            // STEP 1: Fetch current leaderboard after question ends
            const leaderboard = await getLeaderboardService(roomId);

            // STEP 2: Tell clients to show the big centered leaderboard!
            io.to(roomId).emit("show_mid_round_leaderboard", {
                leaderboard,
                nextIndex: currentIndex + 1
            });

            console.log(`Room ${roomId}: Showing Mid-Round Leaderboard`);

            // ⏱️ THE 5-SECOND LEADERBOARD BREAK
            setTimeout(() => {
                // Return to this function to go to the next question
                goToNextQuestion(roomId, io)
            }, 5000);

        }, 10000);

    } catch (error) {
        console.error(`Error in game loop for room ${roomId}:`, error)
    }
}
