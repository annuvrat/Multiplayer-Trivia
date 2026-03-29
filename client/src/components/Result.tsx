import React from 'react';

interface ResultProps {
    winner: string;
    leaderboard: {
        user: string;
        score: number;
    }[];
    onRestart: () => void;
}

const Result: React.FC<ResultProps> = ({ winner, leaderboard, onRestart }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[var(--bg-primary)] relative overflow-hidden">

            {/* BACKGROUND DECO */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
                <div className="absolute top-10 left-10 w-40 h-40 bg-blue-500 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-10 right-10 w-60 h-60 bg-purple-500 rounded-full blur-[120px]"></div>
            </div>

            <div className="space-y-24 z-10 animate-in zoom-in-75 duration-700">
                <div className="space-y-8">
                    <div className="inline-block px-8 py-3 bg-yellow-400 text-black font-black text-xs rounded-full uppercase tracking-widest shadow-xl animate-bounce">Ultimate Arena Hero</div>
                    <h2 className="text-[10rem] md:text-[14rem] font-black italic leading-tight text-[var(--text-primary)] drop-shadow-2xl uppercase transition-all select-none tracking-tighter">
                        {winner}
                    </h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-sm">Champion of the Arena</p>
                </div>

                <div className="grid gap-8 justify-center">
                    <button
                        className="px-20 py-8 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-full hover:scale-110 active:scale-95 transition-all text-3xl shadow-2xl shadow-blue-500/30"
                        onClick={onRestart}
                    >
                        Restart Arena 🏆
                    </button>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] italic">Join the next show instantly</p>
                </div>

                {/* TOP 3 PODIUM SUBTLE LIST */}
                <div className="flex flex-wrap justify-center gap-10 opacity-60">
                    {leaderboard.slice(0, 3).map((u, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="text-2xl font-black text-gray-400">#{i + 1}</span>
                            <span className="text-xl font-bold uppercase text-[var(--text-secondary)]">{u.user}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Result;
