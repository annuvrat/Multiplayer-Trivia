import React, { useState, useRef, useEffect } from 'react';
import { Send, Hash, MessageCircle } from 'lucide-react';

interface Message {
    userId: string;
    message?: string;
    emoji?: string;
    timestamp: string;
}

interface LobbyChatProps {
    messages: Message[];
    onSendMessage: (msg: string) => void;
    onSendEmoji: (emoji: string) => void;
    currentUserId: string;
}

const EMOJIS = ["🔥", "😂", "💯", "👋", "🚀", "🎮", "👑", "✨"];

const LobbyChat: React.FC<LobbyChatProps> = ({ messages, onSendMessage, onSendEmoji, currentUserId }) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-[400px] w-80 bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-10 duration-500">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <MessageCircle size={18} />
                </div>
                <h3 className="text-sm font-bold tracking-tight text-gray-800 dark:text-white uppercase tracking-[0.1em]">Lobby Chat</h3>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400/50 space-y-2">
                        <Hash size={32} strokeWidth={1} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No messages yet</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex flex-col ${msg.userId === currentUserId ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                        <span className="text-[10px] font-bold text-blue-400/80 mb-1 px-2">{msg.userId}</span>
                        {msg.message && (
                            <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] break-words ${msg.userId === currentUserId
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white/10 text-gray-800 dark:text-white rounded-tl-none border border-white/10 shadow-sm'
                                }`}>
                                {msg.message}
                            </div>
                        )}
                        {msg.emoji && (
                            <div className="text-3xl animate-bounce-short select-none py-1">
                                {msg.emoji}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Emoji Quick Actions */}
            <div className="px-4 py-2 flex justify-between border-t border-white/5 bg-black/5">
                {EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => onSendEmoji(emoji)}
                        className="text-xl hover:scale-125 transition-transform active:scale-95 grayscale-[0.5] hover:grayscale-0"
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-black/10">
                <div className="relative group">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Say something..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all dark:text-white placeholder:text-gray-500"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1.5 w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 active:scale-90"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LobbyChat;
