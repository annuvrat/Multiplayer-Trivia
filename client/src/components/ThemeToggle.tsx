import React, { useEffect, useState } from 'react';

const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(
        (localStorage.getItem('menti-theme') as 'light' | 'dark') || 'light'
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('menti-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <button
            onClick={toggleTheme}
            className="fixed top-6 right-6 z-[100] p-3 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm hover:scale-110 transition-transform active:scale-90"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
    );
};

export default ThemeToggle;
