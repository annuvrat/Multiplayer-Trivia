import React from 'react';

interface LobbyProps {
    players: string[];
    roomId: string;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    topic: string;
    setTopic: (t: string) => void;
    difficulty: string;
    setDifficulty: (d: string) => void;
    qCount: number;
    setQCount: (c: number) => void;
    onGenerate: () => void;
    onStart: () => void;
    getPlayerIcon: (name: string) => string;
}

const Lobby: React.FC<LobbyProps> = ({
    players,
    roomId,
    isSettingsOpen,
    setIsSettingsOpen,
    topic,
    setTopic,
    difficulty,
    setDifficulty,
    qCount,
    setQCount,
    onGenerate,
    onStart,
    getPlayerIcon
}) => {
    return (
        <div className="min-h-screen relative flex items-center justify-center p-8 overflow-hidden bg-hero-pattern">
            <div className="absolute top-10 left-10 z-20 space-y-1">
                <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-[0.3em] uppercase pl-1">Join at menti.arena</h3>
                <div className="text-4xl font-black italic tracking-tighter text-gray-800 dark:text-white drop-shadow-sm">Room Code: <span className="text-blue-600 dark:text-blue-400">{roomId.toUpperCase()}</span></div>
            </div>

            <div className="absolute inset-0 z-0">
                {players.map((p, i) => (
                    <div key={i} className="absolute flex flex-col items-center gap-2 animate-float pointer-events-none group" style={{
                        top: `${[25, 60, 30, 75, 45, 15, 80][i % 7]}%`,
                        left: `${[10, 40, 70, 50, 85, 5, 20][i % 7]}%`,
                        animationDelay: `${i * 0.5}s`,
                        opacity: 0.8
                    }}>
                        <div className="text-5xl group-hover:scale-125 transition-transform">{getPlayerIcon(p)}</div>
                        <div className="px-5 py-2 bg-[var(--bg-primary)] backdrop-blur-md rounded-full text-xs font-bold tracking-wide border border-[var(--border-color)] shadow-xl">{p}</div>
                    </div>
                ))}
            </div>

            <div className="z-10 text-center space-y-10 animate-in zoom-in-50 duration-500">
                <div className="relative">
                    <div className="text-[14rem] font-black leading-none italic tracking-tighter text-gray-800 dark:text-white transition-all transform hover:scale-105 active:scale-95 drop-shadow-xl select-none">{players.length}</div>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400 absolute -bottom-4 right-[-2rem] -rotate-12 bg-[var(--bg-primary)] px-6 py-1 border border-blue-600/30 rounded-2xl shadow-xl">HEROES READY</p>
                </div>
                <div className="inline-flex items-center gap-3 px-8 py-3 bg-[var(--bg-primary)] rounded-full border border-[var(--border-color)] shadow-xl">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-bold tracking-[0.2em] text-gray-500 uppercase">Wait for Signal</span>
                </div>
            </div>

            <div className={`fixed right-0 top-0 h-full w-[20rem] bg-[var(--bg-primary)] border-l border-[var(--border-color)] transition-transform duration-500 ease-in-out z-50 p-10 flex flex-col shadow-2xl ${isSettingsOpen ? "translate-x-0" : "translate-x-full"}`}>
                <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="absolute -left-12 top-10 w-12 h-12 bg-[var(--bg-primary)] border border-[var(--border-color)] border-r-0 rounded-l-2xl flex items-center justify-center text-xl hover:bg-[var(--bg-secondary)] transition-all">
                    {isSettingsOpen ? "✕" : "⚙️"}
                </button>

                <div className="space-y-12 flex-1 pt-6">
                    <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-[0.4em] uppercase">Control Panel</h3>
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Arena Topic</label>
                            <input className="menti-input h-14" value={topic} onChange={e => setTopic(e.target.value)} />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Difficulty Level</label>
                            <select className="menti-input h-14 appearance-none cursor-pointer" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Questions</label>
                            <input type="number" className="menti-input h-14" value={qCount} onChange={e => setQCount(Number(e.target.value))} />
                        </div>
                    </div>
                </div>

                <div className="pt-8 space-y-4">
                    <button className="menti-button-secondary w-full" onClick={onGenerate}>Regenerate AI Quiz 🤖</button>
                    <button className="menti-button-primary w-full text-xl h-16" onClick={onStart}>Start Show 🎆</button>
                    <p className="text-[10px] text-gray-400 font-bold text-center italic mt-4 uppercase">Host permissions required</p>
                </div>
            </div>
        </div>
    );
};

export default Lobby;
