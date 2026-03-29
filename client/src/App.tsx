import { useEffect, useState } from 'react'
import { socket } from './scoket'
import './index.css'

// 🏛️ COMPONENTS
import ThemeToggle from './components/ThemeToggle'
import Join from './components/Join'
import Lobby from './components/Lobby'
import Quiz from './components/Quiz'
import Leaderboard from './components/Leaderboard'
import Result from './components/Result'

const HERO_ICONS = ["🔥", "🚀", "💎", "👾", "⚡", "🌈", "🦁", "🐢", "🦊", "🐼", "🍀", "🍕", "🎸", "🛸"];

function App() {
  const [players, setPlayers] = useState<string[]>([]);
  const [roomId, setRoomId] = useState("");
  const [userId, setUserId] = useState("");
  const [joined, setJoined] = useState(false);

  // 🕹️ Game State
  const [gameState, setGameState] = useState<"waiting" | "playing" | "mid-round-leaderboard" | "finished">("waiting");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [qIndex, setQIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);

  // 🧪 AI Generation Settings
  const [topic, setTopic] = useState("General Knowledge");
  const [difficulty, setDifficulty] = useState("Easy");
  const [qCount, setQCount] = useState(5);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  const getPlayerIcon = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return HERO_ICONS[hash % HERO_ICONS.length];
  };

  // 🔊 AUDIO HELPER
  const playSound = (soundFile: string) => {
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.play().catch(e => console.log("Audio playback failed:", e));
  };

  const handleGenerateQuestions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/rooms/${roomId.toLowerCase()}/generate-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty, questionCount: qCount }),
      });
      if (response.ok) alert("Questions regenerated! 🧠⚡");
    } catch (err) {
      console.error("Error generating questions:", err);
    }
  };

  const handleStartGame = async () => {
    try {
      const response = await fetch(`http://localhost:5000/rooms/${roomId.toLowerCase()}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const data = await response.json();
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error("Error starting game:", err);
    }
  };

  const handleSubmitAnswer = async (choiceIndex: number) => {
    playSound("submit_sound.mp3");
    try {
      const res = await fetch(`http://localhost:5000/rooms/${roomId.toLowerCase()}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, questionIndex: qIndex, selectedOption: choiceIndex }),
      });
      const data = await res.json();
      if (data.correct) {
        playSound("correct_answer.mp3");
      } else {
        playSound("wrong_answer.mp3");
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch(`http://localhost:5000/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        setRoomId(data.roomId);
      }
    } catch (err) {
      console.error("Error creating room:", err);
    }
  }

  const handleJoin = async () => {
    if (!roomId || !userId) return alert("Missing Room ID or Name!");
    const cleanRoomId = roomId.trim().toLowerCase();
    try {
      const response = await fetch(`http://localhost:5000/rooms/join/${cleanRoomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        socket.emit("join_room", { roomId: cleanRoomId, userId });
        const roomRes = await fetch(`http://localhost:5000/rooms/${cleanRoomId}`);
        const roomData = await roomRes.json();
        if (roomData) setPlayers(roomData.players || []);
        setJoined(true);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to join room.");
      }
    } catch (err) {
      console.error("Error joining:", err);
    }
  }

  useEffect(() => {
    socket.connect();
    socket.on('player_joined', (data) => setPlayers(prev => Array.from(new Set([...prev, data.userId]))));
    socket.on('player_left', (data) => setPlayers(prev => prev.filter(p => p !== data.userId)));
    socket.on('game_started', () => {
      setGameState("playing");
      playSound("game_start.mp3");
    });
    socket.on('new_question', (data) => {
      setCurrentQuestion(data.question);
      setQIndex(data.index);
      setGameState("playing");
      setTimeLeft(10);
    });
    socket.on('show_mid_round_leaderboard', (data) => {
      setLeaderboard(data.leaderboard);
      setGameState("mid-round-leaderboard");
    });
    socket.on('leaderboard_update', (data) => setLeaderboard(data.leaderboard));
    socket.on('game_ended', (data) => {
      setWinner(data.winner);
      setLeaderboard(data.leaderboard);
      setGameState("finished");
      playSound("end_game_winner.mp3");
    });

    return () => { socket.disconnect(); }
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  return (
    <div className="min-h-screen relative font-sans">
      <ThemeToggle />

      {!joined && (
        <Join
          roomId={roomId} setRoomId={setRoomId}
          userId={userId} setUserId={setUserId}
          onJoin={handleJoin} onCreate={handleCreate}
        />
      )}

      {joined && gameState === "waiting" && (
        <Lobby
          players={players}
          roomId={roomId}
          isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen}
          topic={topic} setTopic={setTopic}
          difficulty={difficulty} setDifficulty={setDifficulty}
          qCount={qCount} setQCount={setQCount}
          onGenerate={handleGenerateQuestions}
          onStart={handleStartGame}
          getPlayerIcon={getPlayerIcon}
        />
      )}

      {joined && gameState === "playing" && (
        <Quiz
          currentQuestion={currentQuestion}
          qIndex={qIndex}
          timeLeft={timeLeft}
          onSubmit={handleSubmitAnswer}
        />
      )}

      {joined && gameState === "mid-round-leaderboard" && (
        <Leaderboard leaderboard={leaderboard} />
      )}

      {joined && gameState === "finished" && (
        <Result
          winner={winner || "Unknown Champion"}
          leaderboard={leaderboard}
          onRestart={() => window.location.reload()}
        />
      )}
    </div>
  )
}

export default App
