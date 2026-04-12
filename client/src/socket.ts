
import { io } from "socket.io-client"

const Url = "https://extrorse-kimber-dulcetly.ngrok-free.dev"

export const socket = io(Url, {
    autoConnect: false,
    extraHeaders: {
        "ngrok-skip-browser-warning": "true"
    }
})