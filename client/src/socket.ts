
import { io } from "socket.io-client"

const Url = "https://quiz.annuvrat.com"

export const socket = io(Url, {
    autoConnect: false,
    extraHeaders: {
        "ngrok-skip-browser-warning": "true"
    }
})