import React from 'react';

interface LeaderboardProps {
    leaderboard: {
        user: string;
        score: number;
    }[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ leaderboard }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[var(--bg-primary)]">
            <div className="w-full max-w-4xl space-y-12 animate-in slide-in-from-bottom-5 duration-700">

                <div className="text-center space-y-4">
                    <h1 className="text-6xl font-black italic tracking-tight text-blue-600 dark:text-blue-400">Current Standings</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs">Who's leading the pack?</p>
                </div>

                <div className="menti-card p-4 md:p-12 space-y-4 overflow-hidden border border-[var(--border-color)] shadow-2xl">
                    {leaderboard.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 font-bold italic text-2xl">Calculating scores...</div>
                    ) : (
                        leaderboard.map((u, i) => (
                            <div key={i} className="group flex items-center justify-between p-6 bg-[var(--bg-secondary)] rounded-2xl border border-transparent hover:border-blue-400 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center gap-10">
                                    <span className={`text-4xl font-black italic tracking-tighter w-12 text-center transition-colors ${i === 0 ? "text-yellow-500 scale-125" : "text-gray-300 dark:text-gray-700 group-hover:text-blue-500"}`}>
                                        #{i + 1}
                                    </span>
                                    <div className="space-y-1">
                                        <span className="text-3xl font-black uppercase text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {u.user}
                                        </span>
                                        {i === 0 && <span className="block text-[10px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest pl-1">Leading the Arena</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-4xl font-black text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">{u.score.toLocaleString()}</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Points earned</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* AUTO-TRANSITION INDICATOR */}
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
                    <span className="text-sm font-bold text-gray-400 tracking-widest uppercase italic">Preparing next round...</span>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
