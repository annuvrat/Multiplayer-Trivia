import React, { useMemo } from 'react';
import LobbyChat from './LobbyChat';
import { Volume2, VolumeX, Loader2, Share, LogOut, Users, Settings2, Sparkles } from 'lucide-react';

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
    messages: any[];
    onSendMessage: (msg: string) => void;
    onSendEmoji: (emoji: string) => void;
    currentUserId: string;
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
    loading: boolean;
    copyInviteLink: () => void;
    onLeave: () => void;
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
    getPlayerIcon,
    messages,
    onSendMessage,
    onSendEmoji,
    currentUserId,
    soundEnabled,
    setSoundEnabled,
    loading,
    copyInviteLink,
    onLeave
}) => {
    // Generate random positions for players that stay stable across re-renders
    const playerPositions = useMemo(() => {
        return players.map((_, i) => ({
            top: `${Math.floor(Math.random() * 60) + 15}%`,
            left: `${Math.floor(Math.random() * 70) + 10}%`,
            delay: `${i * 0.2}s`,
            scale: 0.8 + Math.random() * 0.5
        }));
    }, [players.length]);

    return (
        <div className="min-h-screen relative flex items-center justify-center p-8 overflow-hidden bg-hero-pattern select-none">
            {/* TOP BAR UI */}
            <div className="absolute top-10 left-10 z-20 flex flex-col gap-4">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-[0.4em] uppercase pl-1 text-left opacity-70">Join the Arena</h3>
                    <div className="flex items-center gap-4 group">
                        <div className="text-4xl font-black italic tracking-tighter text-gray-800 dark:text-white drop-shadow-sm text-left">
                            Code: <span className="text-blue-600 dark:text-blue-400">{roomId.toUpperCase()}</span>
                        </div>
                        <button
                            onClick={copyInviteLink}
                            className="p-3 bg-white/10 hover:bg-blue-600 hover:text-white rounded-2xl border border-white/20 transition-all active:scale-90 shadow-lg backdrop-blur-md"
                            title="Copy Invite Link"
                        >
                            <Share size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full w-fit backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black tracking-widest text-green-600 dark:text-green-400 uppercase">Live Connection</span>
                </div>
            </div>

            {/* FLOATING PLAYERS ARENA */}
            <div className="absolute inset-0 z-0">
                {players.map((p, i) => (
                    <div key={p} className="absolute flex flex-col items-center gap-3 animate-float pointer-events-none group" style={{
                        top: playerPositions[i]?.top || '50%',
                        left: playerPositions[i]?.left || '50%',
                        animationDelay: playerPositions[i]?.delay || '0s',
                        transform: `scale(${playerPositions[i]?.scale || 1})`,
                    }}>
                        <div className="w-20 h-20 relative p-1 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/10 shadow-2xl transition-all group-hover:scale-110 group-hover:border-blue-500/50">
                            <img src={getPlayerIcon(p)} alt={p} className="w-full h-full drop-shadow-xl" />
                            {p === currentUserId && (
                                <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg">YOU</div>
                            )}
                        </div>
                        <div className="px-5 py-2 bg-[var(--bg-primary)]/80 backdrop-blur-xl rounded-2xl text-[10px] font-black tracking-widest border border-[var(--border-color)] shadow-2xl uppercase text-[var(--text-primary)]">
                            {p}
                        </div>
                    </div>
                ))}
            </div>

            {/* CENTER PIECE */}
            <div className="z-10 text-center animate-in zoom-in-95 duration-500 select-none">
                <div className="relative group perspective-1000">
                    <div className="absolute -inset-20 bg-blue-600/5 rounded-full blur-[120px] -z-10 group-hover:bg-blue-600/15 transition-all duration-1000"></div>

                    <div className="relative flex flex-col items-center justify-center">
                        <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-[1em] mb-4 uppercase opacity-50 pl-4">Arena Status</div>
                        <div className="text-[18rem] md:text-[22rem] font-black italic leading-none tracking-tighter text-gray-800 dark:text-white transition-transform group-hover:scale-105 duration-700 drop-shadow-[0_20px_40px_rgba(37,99,235,0.2)]">
                            {players.length}
                        </div>

                        <div className="mt-4 px-10 py-4 bg-[var(--bg-primary)]/40 backdrop-blur-3xl border border-[var(--border-color)] rounded-3xl shadow-2xl">
                            <div className="text-[14px] font-black text-[var(--text-primary)] uppercase tracking-[0.5em] italic flex items-center gap-4">
                                <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></span>
                                Heroes Waiting
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHAT TAB */}
            <div className="absolute bottom-8 left-8 z-20">
                <LobbyChat
                    messages={messages}
                    onSendMessage={onSendMessage}
                    onSendEmoji={onSendEmoji}
                    currentUserId={currentUserId}
                />
            </div>

            {/* SETTINGS SIDEBAR */}
            <div className={`fixed right-0 top-0 h-full w-full sm:w-[24rem] bg-[var(--bg-primary)]/95 backdrop-blur-3xl border-l border-[var(--border-color)] transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) z-50 flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] ${isSettingsOpen ? "translate-x-0" : "translate-x-full"}`}>

                <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={`absolute -left-16 top-10 w-16 h-16 flex items-center justify-center transition-all ${isSettingsOpen ? 'bg-red-500 text-white rounded-l-3xl shadow-red-500/30' : 'bg-[var(--bg-primary)] text-blue-600 border border-[var(--border-color)] border-r-0 rounded-l-3xl'}`}
                >
                    {isSettingsOpen ? <LogOut size={24} className="rotate-180" /> : <Settings2 size={24} />}
                </button>

                <div className="p-10 flex-1 overflow-y-auto space-y-12">
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-[0.5em] uppercase pl-1 opacity-70">Room Configuration</h3>
                        <h2 className="text-3xl font-black text-[var(--text-primary)] italic tracking-tight">Arena Setup</h2>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                <Sparkles size={12} className="text-blue-600" />
                                Battle Theme
                            </label>
                            <input
                                className="menti-input h-14 bg-white/5 border-white/10 focus:border-blue-600 text-base font-bold"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="e.g. Marvel Universe..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Difficulty</label>
                                <select className="menti-input h-14 appearance-none cursor-pointer bg-white/5 border-white/10" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                                    <option>Easy</option>
                                    <option>Medium</option>
                                    <option>Hard</option>
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Rounds</label>
                                <input type="number" className="menti-input h-14 bg-white/5 border-white/10" value={qCount} onChange={e => setQCount(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/10 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Audio Experience</span>
                                <div className={`w-2 h-2 rounded-full ${soundEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
                            </div>
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`w-full h-16 rounded-2xl flex items-center justify-between px-6 transition-all ${soundEnabled ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'}`}
                            >
                                <span className="font-bold text-sm tracking-wide">{soundEnabled ? 'Immersion Active' : 'Silence Mode'}</span>
                                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-10 border-t border-white/10 bg-[var(--bg-secondary)]/50 space-y-4">
                    <div className="flex gap-4">
                        <button
                            onClick={onLeave}
                            className="flex-1 h-16 rounded-2xl flex items-center justify-center gap-3 bg-red-500/5 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-black text-sm uppercase tracking-widest"
                        >
                            <LogOut size={18} />
                            Exit
                        </button>
                        <button
                            className="flex-[2] h-16 rounded-2xl flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black text-sm uppercase tracking-widest"
                            onClick={onGenerate}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin text-blue-500" size={20} /> : <Sparkles size={18} className="text-yellow-500" />}
                            AI Re-Quiz
                        </button>
                    </div>

                    <button
                        className="menti-button-primary w-full h-20 text-2xl flex items-center justify-center gap-4 shadow-blue-600/20 hover:shadow-blue-600/40 relative overflow-hidden group"
                        onClick={onStart}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-transparent opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        Enter Arena 🎆
                    </button>

                    <div className="flex items-center justify-center gap-2 pt-2 opacity-50">
                        <Users size={12} className="text-gray-400" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Host Exclusive Controls</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Lobby;
