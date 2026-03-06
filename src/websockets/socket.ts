import { Socket, Server } from "socket.io";

export default function setupSocket(io: Server) {

  io.on("connection", (socket: Socket) => {

    console.log("User connected:", socket.id);

    socket.on("join_room", ({ roomId , userId }) => {

      socket.join(roomId);

      socket.data.roomId = roomId;
      socket.data.userId = userId;

      console.log(`${userId} joined room ${roomId}`);

      io.to(roomId).emit("player_joined", {
        userId,
        socketId: socket.id
      });

    });

    socket.on("disconnect", () => {

      const { roomId, userId } = socket.data;

      if (roomId) {
        io.to(roomId).emit("player_left", {
          userId,
          socketId: socket.id
        });
      }

      console.log("User disconnected:", socket.id);
    });

  });

}