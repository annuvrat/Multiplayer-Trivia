import { useEffect, useState } from 'react'
import { socket } from './scoket'
import './App.css'

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [players, setPlayers] = useState<string[]>([]);

  const [roomId, setRoomId] = useState("");
  const [userId, setUserId] = useState("");
  const [joined, setJoined] = useState(false);
  const handleCreate = async () => {
    try {
      const response = await fetch(`http://localhost:5000/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        setRoomId(data.roomId); // This sets the ID automatically!
        alert(`New Room Created: ${data.roomId}`);
      }
    } catch (err) {
      console.error("Error creating room:", err);
    }
  }

  const handleJoin = async () => {
    if (!roomId || !userId) return alert("Please enter Room ID and User ID");
    try {
      // 1. Tell the backend we're joining (The HTTP part)
      // Note: Change the URL to match your server
      const response = await fetch(`http://localhost:5000/rooms/join/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        // 2. Tell the WebSocket we're joining (The Real-time part)
        socket.emit("join_room", { roomId, userId });

        // 🌟 NEW: Get everyone already in the room so we're not lonely!
        const roomRes = await fetch(`http://localhost:5000/rooms/${roomId}`);
        const roomData = await roomRes.json();
        if (roomData && roomData.players) {
          setPlayers(roomData.players);
        }

        setJoined(true);
      }
    } catch (err) {
      console.error("Error joining room:", err);
    }
  }
  useEffect(() => {
    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    const onPlayerJoined = (data: { userId: string }) => {
      // 🛡️ De-duplicate the list so we don't see the same person twice
      setPlayers((prev) => Array.from(new Set([...prev, data.userId])));
      console.log(`${data.userId} joined the room!`);
    };
    socket.on('player_joined', onPlayerJoined);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('player_joined', onPlayerJoined)
    }
  }, []);
  return (

    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Quiz Arena 🏆</h1>
      <p>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>

      {!joined ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '250px' }}>
          <input
            placeholder="Room ID (e.g. 123)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            placeholder="Your Name"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <button onClick={handleJoin}>Join Room</button>
          <button onClick={handleCreate} style={{ marginTop: '10px', background: '#4CAF50', color: 'white' }}>
            Create New Room
          </button>      </div>
      ) : (
        <div>
          <h3>Joined Room: {roomId}</h3>
          <p>Waiting for the host to start the game...</p>

          <h4>Players inside:</h4>
          <ul>
            {/* We "map" through our array and turn each name into a <li> item */}
            {players.map((p, index) => (
              <li key={index} style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                👤 {p} {p === userId ? "(You)" : ""}
              </li>
            ))}
          </ul>

          {/* Optional: Add a "Start Game" button for the host */}
          <button style={{ backgroundColor: 'orange', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>
            Start Game 🚀
          </button>
        </div>
      )}

    </div>
  )

}

export default App
