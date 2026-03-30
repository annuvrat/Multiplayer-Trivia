import React from 'react';
import { Loader2 } from 'lucide-react';

interface JoinProps {
    roomId: string;
    setRoomId: (id: string) => void;
    userId: string;
    setUserId: (name: string) => void;
    onJoin: () => void;
    onCreate: () => void;
    selectedAvatar: string;
    setAvatar: (avatar: string) => void;
    loading: boolean;
}

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

const Join: React.FC<JoinProps> = ({ roomId, setRoomId, userId, setUserId, onJoin, onCreate, selectedAvatar, setAvatar, loading }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 relative bg-hero-pattern">
            <div className="w-full max-w-md z-10 space-y-12 text-center animate-in fade-in slide-in-from-bottom-5 duration-700">

                <div className="space-y-4">
                    <h1 className="text-6xl font-black italic tracking-tight text-blue-600 dark:text-blue-400">Menti Arena</h1>
                    <p className="text-gray-500 font-medium">REAL-TIME INTERACTIVE QUIZ</p>
                </div>

                <div className="menti-card space-y-8 text-left transition-all hover:shadow-xl hover:translate-y-[-4px]">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Room Code</label>
                            <input
                                placeholder="123456"
                                className="menti-input text-center font-bold text-3xl placeholder-gray-300 dark:placeholder-gray-700 focus:shadow-sm"
                                value={roomId}
                                onChange={e => setRoomId(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Your Name</label>
                            <input
                                placeholder="Future Winner"
                                className="menti-input"
                                value={userId}
                                onChange={e => setUserId(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Choose Hero</label>
                            <div className="grid grid-cols-7 gap-3">
                                {HERO_ICONS.map(avatar => (
                                    <button
                                        key={avatar}
                                        onClick={() => setAvatar(avatar)}
                                        className={`w-12 h-12 flex items-center justify-center p-1 rounded-xl transition-all ${selectedAvatar === avatar ? 'bg-blue-600 scale-110 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400' : 'bg-[var(--bg-secondary)] hover:bg-[var(--border-color)]'}`}
                                    >
                                        <img src={avatar} className="w-full h-full" alt="Avatar" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 pt-4">
                        <button
                            className="menti-button-primary flex items-center justify-center gap-2"
                            onClick={onJoin}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "Enter the Arena 🚀"}
                        </button>
                        <div className="flex items-center gap-4 px-2">
                            <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                            <span className="text-xs text-gray-400 font-bold">OR</span>
                            <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                        </div>
                        <button
                            className="menti-button-secondary hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
                            onClick={onCreate}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "Start New Arena ✨"}
                        </button>
                    </div>
                </div>

                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] pt-4">© 2026 Menti Arena Design System</p>
            </div>
        </div>
    );
};

export default Join;
