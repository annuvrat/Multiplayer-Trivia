import { useEffect, useState, useMemo } from 'react'
import { socket } from './scoket'
import './index.css'

// 🏛️ HERO ICONS LIST
const HERO_ICONS = ["🔥", "🚀", "💎", "👾", "⚡", "🌈", "🦁", "🐢", "🦊", "🐼", "🍀", "🍕", "🎸", "🛸"];

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected)
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

  const handleGenerateQuestions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/rooms/${roomId}/generate-test`, {
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
      const response = await fetch(`http://localhost:5000/rooms/${roomId}/start`, {
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
    try {
      await fetch(`http://localhost:5000/rooms/${roomId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, questionIndex: qIndex, selectedOption: choiceIndex }),
      });
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
    const cleanRoomId = roomId.trim().toUpperCase();
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
      }
    } catch (err) {
      console.error("Error joining:", err);
    }
  }

  useEffect(() => {
    socket.connect();
    socket.on('player_joined', (data) => setPlayers(prev => Array.from(new Set([...prev, data.userId]))));
    socket.on('player_left', (data) => setPlayers(prev => prev.filter(p => p !== data.userId)));
    socket.on('game_started', () => setGameState("playing"));
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
    });

    return () => { socket.disconnect(); }
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white font-sans selection:bg-purple-900 overflow-hidden">
      
      {/* 🚀 SCREEN 1: JOIN/CREATE */}
      {!joined && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 pointer-events-none"></div>
          <div className="w-full max-w-md z-10 space-y-8 text-center">
            <h1 className="text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">ARENA</h1>
            <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 text-left">
              <div className="space-y-4">
                <input placeholder="Enter Room Code" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 ring-purple-500 text-center font-bold text-2xl" value={roomId} onChange={e => setRoomId(e.target.value)}/>
                <input placeholder="Your Hero Name" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 ring-purple-500 text-xl font-semibold" value={userId} onChange={e => setUserId(e.target.value)}/>
              </div>
              <div className="grid gap-4">
                <button className="py-5 bg-purple-600 hover:bg-purple-500 font-black rounded-2xl transition-all shadow-lg shadow-purple-600/20 active:scale-95 text-xl" onClick={handleJoin}>JOIN GAME</button>
                <div className="h-px bg-white/10 my-2"></div>
                <button className="py-5 bg-white/10 border border-white/10 font-bold rounded-2xl hover:bg-white/20 transition-all text-xl" onClick={handleCreate}>CREATE NEW ARENA</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 SCREEN 2: THE "HERO" LOBBY */}
      {joined && gameState === "waiting" && (
        <div className="min-h-screen relative flex items-center justify-center p-8 overflow-hidden">
          
          {/* FLOATING HEROES */}
          <div className="absolute inset-0 z-0">
             {players.map((p, i) => (
                <div key={i} className="absolute flex flex-col items-center gap-2 animate-float pointer-events-none group" style={{
                    top: `${[20, 60, 30, 70, 45, 15, 80][i % 7]}%`,
                    left: `${[15, 35, 75, 55, 85, 5, 25][i % 7]}%`,
                    animationDelay: `${i * 0.7}s`,
                    opacity: 0.8
                }}>
                  <div className="text-6xl group-hover:scale-125 transition-transform">{getPlayerIcon(p)}</div>
                  <div className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm font-bold tracking-wide border border-white/10 shadow-xl">{p}</div>
                </div>
             ))}
          </div>

          {/* CENTER STAGE */}
          <div className="z-10 text-center space-y-6">
             <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs font-black tracking-[0.3em] text-gray-400 uppercase">Wait for Signal</span>
             </div>
             <div className="relative">
                <h1 className="text-[14rem] font-black leading-none italic tracking-tighter text-white drop-shadow-[0_0_50px_rgba(168,85,247,0.3)]">{players.length}</h1>
                <p className="text-2xl font-black text-purple-400 absolute bottom-4 -right-12 -rotate-12 bg-[#0a0a1a] px-4 py-1 border border-purple-400/30">HEROES READY</p>
             </div>
             <div className="text-gray-500 font-black tracking-widest text-lg">CODE: {roomId.toUpperCase()}</div>
          </div>

          {/* ⚙️ UNIFIED SIDEBAR */}
          <div className={`fixed right-0 top-0 h-full w-[22rem] bg-[#0a0a1a]/80 backdrop-blur-3xl border-l border-white/10 transition-transform duration-500 ease-in-out z-50 p-10 flex flex-col ${isSettingsOpen ? "translate-x-0 shadow-[-50px_0_100px_rgba(0,0,0,0.5)]" : "translate-x-full"}`}>
             
             {/* TOGGLE BUTTON */}
             <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="absolute -left-14 top-10 w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/10 border-r-0 rounded-l-2xl flex items-center justify-center text-xl hover:bg-white/20 transition-all">
               {isSettingsOpen ? "✕" : "⚙️"}
             </button>

             <div className="space-y-12 flex-1">
                <h3 className="text-sm font-black text-purple-400 tracking-[0.4em] uppercase">Show Manager</h3>
                <div className="space-y-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Topic</label>
                      <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:ring-2 ring-purple-600 font-semibold" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic..."/>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Difficulty Level</label>
                      <select className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:ring-2 ring-purple-600 font-semibold cursor-pointer appearance-none" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
                          <option className="bg-[#0a0a1a]">Easy</option>
                          <option className="bg-[#0a0a1a]">Medium</option>
                          <option className="bg-[#0a0a1a]">Hard</option>
                      </select>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Question Count</label>
                      <input type="number" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:ring-2 ring-purple-600 font-bold" value={qCount} onChange={e=>setQCount(Number(e.target.value))}/>
                   </div>
                </div>
             </div>

             <div className="pt-8 border-t border-white/10 space-y-4">
                <button className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20" onClick={handleGenerateQuestions}>REGENERATE QUIZ 🤖</button>
                <button className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl text-xl shadow-xl shadow-purple-600/20" onClick={handleStartGame}>START LIVE SHOW 🧨</button>
                <p className="text-[10px] text-gray-600 font-bold text-center italic mt-4 uppercase">Only host can initiate sequence</p>
             </div>
          </div>
        </div>
      )}

      {/* 🚀 SCREEN 3: ACTIVE QUIZ */}
      {joined && gameState === "playing" && (
        <div className="flex flex-col items-center justify-center min-vh-screen p-8 bg-[#0a0a1a]">
          <div className="fixed top-0 left-0 w-full h-1 bg-white/10">
             <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${timeLeft * 10}%` }}></div>
          </div>
          <div className="w-full max-w-5xl space-y-16 py-20">
             <div className="text-center space-y-4">
                <span className="text-xs font-black text-purple-400 tracking-[0.5em] uppercase">TRANSMISSION {qIndex + 1}</span>
                <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">{currentQuestion?.question}</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {currentQuestion?.options.map((opt: string, i: number) => (
                    <button key={i} onClick={() => handleSubmitAnswer(i)} className="group flex items-center p-10 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white hover:text-black transition-all active:scale-[0.98] text-left">
                        <span className="w-16 h-16 flex items-center justify-center bg-white/10 rounded-2xl mr-8 text-3xl font-black group-hover:bg-black/5">{String.fromCharCode(65 + i)}</span>
                        <span className="text-3xl font-bold">{opt}</span>
                    </button>
                ))}
             </div>
             <div className="text-center text-9xl font-black opacity-5 italic">{timeLeft}</div>
          </div>
        </div>
      )}

      {/* 🚀 SCREEN 4: STANDINGS */}
      {joined && gameState === "mid-round-leaderboard" && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#0a0a1a]">
            <div className="w-full max-w-3xl space-y-12">
               <h1 className="text-6xl font-black italic text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-white">CURRENT RANKINGS</h1>
               <div className="bg-white/5 backdrop-blur-3xl rounded-[3.5rem] p-12 border border-white/10 shadow-3xl">
                  {leaderboard.map((u, i) => (
                    <div key={i} className="flex items-center justify-between py-8 border-b border-white/5 last:border-0 group">
                       <div className="flex items-center gap-8">
                          <span className={`text-4xl font-black italic transition-colors ${i === 0 ? "text-yellow-400" : "text-white/10"}`}>#{i+1}</span>
                          <span className="text-4xl font-black group-hover:text-purple-400 transition-colors uppercase">{u.user}</span>
                       </div>
                       <span className="text-4xl font-black text-purple-400 group-hover:scale-110 transition-transform">{u.score.toLocaleString()}</span>
                    </div>
                  ))}
               </div>
            </div>
        </div>
      )}

      {/* 🚀 SCREEN 5: FINALE */}
      {joined && gameState === "finished" && (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-[#0a0a1a]">
           <div className="space-y-24">
              <div className="space-y-4">
                <div className="inline-block px-8 py-2 bg-yellow-400 text-black font-black text-sm rounded-full animate-bounce">THE ULTIMATE HERO</div>
                <h2 className="text-[12rem] font-black italic leading-none text-white drop-shadow-[0_0_80px_rgba(168,85,247,0.5)] uppercase">{winner}</h2>
              </div>
              <button className="px-16 py-8 bg-white text-black font-black rounded-full hover:scale-110 transition-all text-3xl shadow-[0_0_50px_rgba(255,255,255,0.2)]" onClick={() => window.location.reload()}>RESTART ARENA 🔄</button>
           </div>
        </div>
      )}
    </div>
  )
}

export default App
