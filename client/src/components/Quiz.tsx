import React from 'react';

interface QuizProps {
    currentQuestion: {
        question: string;
        options: string[];
    };
    qIndex: number;
    timeLeft: number;
    onSubmit: (index: number) => void;
}

const Quiz: React.FC<QuizProps> = ({ currentQuestion, qIndex, timeLeft, onSubmit }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 md:p-12 relative bg-[var(--bg-primary)] overflow-hidden">

            {/* TIMER BAR */}
            <div className="fixed top-0 left-0 w-full h-2 bg-[var(--bg-secondary)] z-50">
                <div
                    className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / 10) * 100}%` }}
                ></div>
            </div>

            <div className="w-full max-w-6xl space-y-16 py-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-6">
                    <span className="inline-block px-4 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black tracking-[0.4em] uppercase rounded-full">Question {qIndex + 1}</span>
                    <h2 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight transition-all duration-300">
                        {currentQuestion?.question}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {currentQuestion?.options.map((opt: string, i: number) => (
                        <button
                            key={i}
                            onClick={() => onSubmit(i)}
                            className="menti-card group flex items-center p-8 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all active:scale-[0.98] text-left relative overflow-hidden"
                        >
                            <span className="w-14 h-14 flex items-center justify-center bg-[var(--bg-secondary)] group-hover:bg-white/20 rounded-xl mr-8 text-2xl font-black transition-colors">{String.fromCharCode(65 + i)}</span>
                            <span className="text-2xl md:text-3xl font-bold flex-1">{opt}</span>

                            {/* SUBTLE HOVER EFFECT */}
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none"></div>
                        </button>
                    ))}
                </div>

                {/* TIMER COUNTDOWN */}
                <div className="flex justify-center pt-8">
                    <div className={`text-9xl font-black italic tracking-tighter transition-all duration-300 ${timeLeft <= 3 ? 'text-red-500 scale-110 animate-pulse' : 'text-[var(--text-secondary)] opacity-10'}`}>
                        {timeLeft}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Quiz;
