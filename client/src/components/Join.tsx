import React from 'react';

interface JoinProps {
    roomId: string;
    setRoomId: (id: string) => void;
    userId: string;
    setUserId: (name: string) => void;
    onJoin: () => void;
    onCreate: () => void;
}

const Join: React.FC<JoinProps> = ({ roomId, setRoomId, userId, setUserId, onJoin, onCreate }) => {
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

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Your Name</label>
                            <input
                                placeholder="Future Winner"
                                className="menti-input"
                                value={userId}
                                onChange={e => setUserId(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-6 pt-4">
                        <button
                            className="menti-button-primary"
                            onClick={onJoin}
                        >
                            Enter the Arena 🚀
                        </button>
                        <div className="flex items-center gap-4 px-2">
                            <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                            <span className="text-xs text-gray-400 font-bold">OR</span>
                            <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                        </div>
                        <button
                            className="menti-button-secondary hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={onCreate}
                        >
                            Start New Arena ✨
                        </button>
                    </div>
                </div>

                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] pt-4">© 2026 Menti Arena Design System</p>
            </div>
        </div>
    );
};

export default Join;
