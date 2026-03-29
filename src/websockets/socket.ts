import { Socket, Server } from "socket.io";
import { leaveRoomService } from "../services/room.service.ts";

type SocketData = {
  roomId?: string
  userId?: string
}

export default function setupSocket(io: Server) {

  io.on("connection", (socket: Socket) => {

    console.log("User connected:", socket.id);

    socket.on("join_room", ({ roomId, userId }) => {

      if (!roomId || !userId) return

      socket.join(roomId)

      socket.data.roomId = roomId
      socket.data.userId = userId

      console.log(`${userId} joined room ${roomId}`)

      io.to(roomId).emit("player_joined", {
        userId,
        socketId: socket.id
      })

    })

    socket.on("leave_room", async ({ roomId, userId }) => {
      await leaveRoomService(roomId, userId);
      socket.leave(roomId);

      io.to(roomId).emit("player_left", {
        userId,
        socketId: socket.id
      })
    })

    socket.on("disconnect", async () => {

      const { roomId, userId } = socket.data as SocketData

      if (roomId && userId) {
        // 🔥 FIX: Remove player from Redis!
        await leaveRoomService(roomId, userId);

        io.to(roomId).emit("player_left", {
          userId,
          socketId: socket.id
        })
      }

      console.log("User disconnected:", socket.id)
    })

  })

}