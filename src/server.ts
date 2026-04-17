import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { Server } from "socket.io"
import roomRoutes from "./routes/room.routes"
import authRoutes from "./routes/auth.routes"
import http from 'http'
import setupScoket from "./websockets/socket"
dotenv.config()
  
const app = express()

app.use(cors())
app.use(express.json())

app.use("/rooms", roomRoutes)
app.use("/auth", authRoutes)
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*"
  }
})

app.set("io", io)

app.get("/", (_, res) => {
  res.send("Quiz Arena Backend Running")
})

const PORT = 5000
setupScoket(io)
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})