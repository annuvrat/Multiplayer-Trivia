import { useEffect, useState } from 'react'
import { socket } from './socket'
import './index.css'

// 🏛️ COMPONENTS
import Join from './components/Join'
import Lobby from './components/Lobby'
import Quiz from './components/Quiz'
import Leaderboard from './components/Leaderboard'
import Result from './components/Result'
import toast, { Toaster } from 'react-hot-toast';

const HERO_ICONS = [
  "https://api.dicebear.com/9.x/bottts/svg?seed=Felix",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Aria",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Zane",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Luna",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Milo",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Nova",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Jasper",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Kira",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Leo",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Maya",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Otto",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Phoebe",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Rico",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Sasha"
];

interface Player {
  userId: string;
  avatar: string;
}

function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomId, setRoomId] = useState("");
  const [userId, setUserId] = useState("");
  const [avatar, setAvatar] = useState(HERO_ICONS[0]);
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
  const [messages, setMessages] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const getPlayerIcon = (name: string) => {
    const player = players.find(p => p.userId === name);
    if (player) return player.avatar;
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return HERO_ICONS[hash % HERO_ICONS.length];
  };

  // 🔊 AUDIO HELPER
  const playSound = (soundFile: string) => {
    if (!soundEnabled) return;
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.play().catch(e => console.log("Audio playback failed:", e));
  };

  const handleSendMessage = (text: string) => {
    socket.emit("send_message", { roomId, userId, message: text });
  };

  const handleSendEmoji = (emoji: string) => {
    socket.emit("send_message", { roomId, userId, emoji });
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied! 🔗", { position: 'bottom-center' });
  };

  const handleGenerateQuestions = async () => {
    setLoading(true);
    const toastId = toast.loading('Brewing fresh trivia with AI...');
    try {
      const response = await fetch(`http://localhost:5000/rooms/${roomId.toLowerCase()}/generate-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty, questionCount: qCount }),
      });
      if (response.ok) {
        toast.success("AI Quiz Ready! 🧠⚡", { id: toastId });
      } else {
        toast.error("AI couldn't think of anything. Try again!", { id: toastId });
      }
    } catch (err) {
      console.error("Error generating questions:", err);
      toast.error("Connection lost in cyberspace.", { id: toastId });
    } finally {
      setLoading(false);
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
        toast.success("Correct! +10 Points", { position: 'top-center' });
      } else {
        playSound("wrong_answer.mp3");
        toast.error(`Wrong! Correct: ${currentQuestion.options[data.correctAnswer]}`, { position: 'top-center' });
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
    }
  };
  const handleRestartRoom = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/rooms/${roomId.toLowerCase()}/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to restart.");
      }
    } catch (err) {
      console.error("Error restarting:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await fetch(`http://localhost:5000/rooms/${roomId.toLowerCase()}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      socket.emit("leave_room", { roomId, userId });
      localStorage.removeItem('menti-session');
      setJoined(false);
      setRoomId("");
      setPlayers([]);
      setGameState("waiting");
      toast("Left the arena. See you later!", { icon: '👋' });
    } catch (err) {
      console.error("Error leaving room:", err);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    const toastId = toast.loading('Forging your battleground...');
    try {
      const response = await fetch(`http://localhost:5000/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        setRoomId(data.roomId);
        toast.success(`Arena Created! Code: ${data.roomId.toUpperCase()}`, {
          id: toastId,
          duration: 10000,
          style: { minWidth: '300px', fontWeight: 'bold' }
        });
      }
    } catch (err) {
      console.error("Error creating room:", err);
      toast.error("Failed to create room.", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  const handleJoin = async (r?: string | any, u?: string, a?: string) => {
    const rId = (r && typeof r === 'string') ? r : roomId;
    const uId = (u && typeof u === 'string') ? u : userId;
    const av = (a && typeof a === 'string') ? a : avatar;

    if (!rId || !uId) return toast.error("Missing Room ID or Name!");
    const cleanRoomId = rId.trim().toLowerCase();
    setLoading(true);
    const toastId = toast.loading('Rushing to the arena...');
    try {
      const response = await fetch(`http://localhost:5000/rooms/join/${cleanRoomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uId, avatar: av }),
      });
      if (response.ok) {
        socket.emit("join_room", { roomId: cleanRoomId, userId: uId, avatar: av });

        console.log(`Auto-joining room ${cleanRoomId} as ${uId}`);

        // FETCH ROOM STATUS & CURRENT QUESTION
        const roomRes = await fetch(`http://localhost:5000/rooms/${cleanRoomId}`);
        if (!roomRes.ok) throw new Error("Could not sync room status");

        const roomData = await roomRes.ok ? await roomRes.json() : null;
        console.log("Room synced:", roomData);

        if (roomData) {
          setGameState(roomData.status);
          if (roomData.status === "playing") {
            setCurrentQuestion(roomData.currentQuestion);
            setQIndex(roomData.currentQuestionIndex);
          }
        }

        setPlayers(roomData.players);

        toast.success(r && typeof r === 'string' ? "Session Restored! ⚡" : "Welcome, Champion! ⚔️", { id: toastId });
        localStorage.setItem('menti-session', JSON.stringify({ roomId: cleanRoomId, userId: uId, avatar: av }));
        setJoined(true);
      } else {
        const data = await response.json();
        console.error("Join failed:", data);
        toast.error(data.error || "Arena full or closed.", { id: toastId });
        // If join fails, clear session to prevent stuck loops
        localStorage.removeItem('menti-session');
      }
    } catch (err) {
      console.error("Error joining:", err);
      toast.error("Arena entrance blocked by network spirits.", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    socket.connect();
    socket.on('player_joined', (data) => {
      setPlayers(prev => {
        const exists = prev.find(p => p.userId === data.userId);
        if (exists) return prev;
        return [...prev, { userId: data.userId, avatar: data.avatar || getPlayerIcon(data.userId) }];
      });
    });
    socket.on('player_left', (data) => setPlayers(prev => prev.filter(p => p.userId !== data.userId)));
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
    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev.slice(-49), msg]);
    });
    socket.on('return_to_lobby', () => {
      setGameState("waiting");
      setLeaderboard([]);
      toast("Returning to lobby for a new round...", { icon: '🔄' });
    });

    return () => {
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('game_started');
      socket.off('new_question');
      socket.off('show_mid_round_leaderboard');
      socket.off('leaderboard_update');
      socket.off('game_ended');
      socket.off('receive_message');
      socket.disconnect();
    }
  }, []);

  // 🔄 RECOVERY & DEEP-LINKING
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room')?.toUpperCase();
    const savedSessionRaw = localStorage.getItem('menti-session');
    const session = savedSessionRaw ? JSON.parse(savedSessionRaw) : null;

    if (urlRoom) {
      setRoomId(urlRoom);
      // Auto-join ONLY if this session is for THIS specific room
      if (session && session.roomId.toUpperCase() === urlRoom && session.userId) {
        setUserId(session.userId);
        setAvatar(session.avatar || HERO_ICONS[0]);
        handleJoin(session.roomId, session.userId, session.avatar || HERO_ICONS[0]);
      } else {
        // Different room link: Clear identity, pre-fill Code
        setJoined(false);
        setUserId(""); // Force them to pick a new name
        // Optional: setRoomId(urlRoom); already done above
      }
    } else if (session && session.roomId && session.userId) {
      setRoomId(session.roomId);
      setUserId(session.userId);
      setAvatar(session.avatar || avatar);
      handleJoin(session.roomId, session.userId, session.avatar || avatar);
    }
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  return (
    <div className="min-h-screen relative font-sans">
      <Toaster position="top-center" reverseOrder={false} />

      {!joined && (
        <Join
          roomId={roomId} setRoomId={setRoomId}
          userId={userId} setUserId={setUserId}
          onJoin={handleJoin} onCreate={handleCreate}
          selectedAvatar={avatar} setAvatar={setAvatar}
          loading={loading}
        />
      )}

      {joined && gameState === "waiting" && (
        <Lobby
          players={players.map(p => p.userId)}
          roomId={roomId}
          isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen}
          topic={topic} setTopic={setTopic}
          difficulty={difficulty} setDifficulty={setDifficulty}
          qCount={qCount} setQCount={setQCount}
          onGenerate={handleGenerateQuestions}
          onStart={handleStartGame}
          getPlayerIcon={getPlayerIcon}
          messages={messages}
          onSendMessage={handleSendMessage}
          onSendEmoji={handleSendEmoji}
          copyInviteLink={copyInviteLink}
          onLeave={handleLeaveRoom}
          currentUserId={userId}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          loading={loading}
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
          onRestart={handleRestartRoom}
          onLeave={handleLeaveRoom}
          isHost={players[0]?.userId === userId}
        />
      )}
    </div>
  )
}

export default App
