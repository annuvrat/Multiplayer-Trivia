import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import roomRoutes from "./routes/room.routes"

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use("/rooms", roomRoutes)

app.get("/", (_, res) => {
  res.send("Quiz Arena Backend Running")
})

const PORT = 5000 

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})