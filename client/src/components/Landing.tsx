import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getFreshIdToken,
  onFirebaseAuthStateChange,
  signOutFirebase,
  type FirebaseGoogleUser,
} from '../firebase/FireBase';
import { API_BASE_URL } from '../config/apiBase';

const BG_MUSIC_SRC = '/sounds/bg_music.mp3';
const BG_MUSIC_VOLUME = 0.18;
const AUTH_USER_STORAGE_KEY = 'quizme-google-user';
const AUTH_TOKEN_STORAGE_KEY = 'quizme-google-token';

const MARQUEE_ITEMS = [
  'AI Quiz Generation', 'Live Leaderboard', 'Team Mode', 'Power-ups',
  'Lobby Chat', 'Champion Reveal', 'Sound Effects', '50+ Topics', 'Custom Difficulty',
];

const features = [
  { num: '01', title: 'AI Quiz Engine', desc: 'Any topic, any difficulty, any length — generated in under 3 seconds by Claude.', accent: 'from-violet-500 to-purple-600' },
  { num: '02', title: 'Real-time Multiplayer', desc: 'Create rooms and battle live. Share a link — friends join instantly, no account needed.', accent: 'from-rose-500 to-pink-600' },
  { num: '03', title: 'Live Leaderboard', desc: 'Rankings update in real-time with score animations and killer audio feedback.', accent: 'from-amber-400 to-orange-500' },
  { num: '04', title: 'Team Mode', desc: 'Split into squads, strategize in lobby chat, and deploy power-ups to dominate.', accent: 'from-cyan-400 to-sky-500' },
  { num: '05', title: 'Player Dashboard', desc: "Track wins, streaks, and performance across every topic you've tackled.", accent: 'from-emerald-400 to-teal-500' },
  { num: '06', title: 'Champion Reveal', desc: 'Epic end-screen animations and customizable victory sounds for the winner.', accent: 'from-yellow-400 to-amber-500' },
];

const steps = [
  { icon: '⚡', title: 'Create a room', desc: 'Start a new game or join with a room code. No download, no setup.' },
  { icon: '🧠', title: 'Generate your quiz', desc: 'Pick topic, difficulty, and question count. AI does the rest in seconds.' },
  { icon: '📣', title: 'Invite & strategize', desc: 'Share the link and talk trash in the lobby — then gear up for battle.' },
  { icon: '👑', title: 'Claim the crown', desc: 'Answer fast, climb the leaderboard, and become the undisputed champion.' },
];

const showcase = [
  {
    icon: '💬',
    title: 'Lobby Chat',
    desc: 'Team up, talk tactics, or just roast each other before the countdown hits zero.',
    tag: 'Room fills → chat unlocks',
    border: 'border-violet-500/30',
    glow: 'shadow-violet-500/10',
    badge: 'bg-violet-500/10 text-violet-300',
  },
  {
    icon: '⚔️',
    title: 'Live Arena',
    desc: 'Every correct answer rockets you up the leaderboard. Every second counts.',
    tag: 'Real-time rank updates',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/10',
    badge: 'bg-rose-500/10 text-rose-300',
  },
  {
    icon: '👑',
    title: 'Champion Reveal',
    desc: "The winner gets their moment. Confetti, sound, and a crown that can't be disputed.",
    tag: 'Epic end-game screen',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10',
    badge: 'bg-amber-500/10 text-amber-300',
  },
];

// Inline keyframe styles we can't do with Tailwind alone
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

  @keyframes marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes blobDrift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(40px, -30px) scale(1.06); }
    66% { transform: translate(-25px, 25px) scale(0.96); }
  }
  @keyframes gridFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes tickerBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }

  .font-syne { font-family: 'Syne', sans-serif; }

  .anim-fade-up { animation: fadeUp 0.6s ease both; }
  .anim-fade-up-1 { animation: fadeUp 0.6s ease 0.1s both; }
  .anim-fade-up-2 { animation: fadeUp 0.6s ease 0.2s both; }
  .anim-fade-up-3 { animation: fadeUp 0.6s ease 0.3s both; }
  .anim-fade-up-4 { animation: fadeUp 0.6s ease 0.4s both; }

  .blob { animation: blobDrift 10s ease-in-out infinite; }
  .blob-2 { animation: blobDrift 13s ease-in-out infinite; animation-delay: -5s; }
  .blob-3 { animation: blobDrift 9s ease-in-out infinite; animation-delay: -3s; }

  .marquee-track { animation: marquee 30s linear infinite; }

  .ticker-dot { animation: tickerBlink 1.4s ease-in-out infinite; }

  .feat-card:hover .feat-num-text {
    background: linear-gradient(90deg, #a78bfa, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* Grid overlay on hero */
  .hero-grid {
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 64px 64px;
  }
`;

const App: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseGoogleUser | null>(() => {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as FirebaseGoogleUser; }
    catch { return null; }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicMutedRef = useRef(musicMuted);
  musicMutedRef.current = musicMuted;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = BG_MUSIC_VOLUME;
    if (musicMuted) { el.pause(); return; }
    const tryPlay = () => { el.volume = BG_MUSIC_VOLUME; return el.play(); };
    let cancelled = false;
    const unlock = () => { if (cancelled || musicMutedRef.current) return; void tryPlay(); };
    void tryPlay().catch(() => {
      if (cancelled) return;
      document.addEventListener('pointerdown', unlock, { passive: true });
      document.addEventListener('keydown', unlock);
    });
    return () => {
      cancelled = true;
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [musicMuted]);

  useEffect(() => {
    const unsub = onFirebaseAuthStateChange((user) => setAuthUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      return;
    }
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(authUser));
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authUser.idToken);
  }, [authUser]);

  const goToAuthPortal = () => {
    const next = encodeURIComponent('/auth?next=%2Fplay');
    navigate(`/go?next=${next}`);
  };

  const handleSignOut = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    try {
      const token = await getFreshIdToken();
      if (token) {
        await fetch(`${API_BASE_URL}/auth/signout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }
      await signOutFirebase();
      setAuthUser(null);
      toast.success('Signed out');
    } catch (error) {
      console.error('Google sign out failed:', error);
      toast.error('Could not sign out right now.');
    } finally {
      setAuthLoading(false);
    }
  };

  const goToPlay = () => {
    const next = encodeURIComponent('/play');
    navigate(`/go?next=${next}`);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <audio ref={audioRef} src={BG_MUSIC_SRC} autoPlay playsInline loop preload="auto" hidden />

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 bg-black/70 backdrop-blur-xl border-b border-white/[0.06]">
        {/* Logo */}
        <div className="font-syne font-extrabold text-xl tracking-tight flex items-center gap-2">
          <span className="ticker-dot w-2 h-2 rounded-full bg-yellow-400 inline-block shadow-[0_0_8px_#facc15]" />
          <span className="text-white">Quiz</span><span className="text-rose-500">Arena</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {['#features', '#how', '#arena'].map((href, i) => (
            <a key={href} href={href} className="text-[13px] text-white/40 hover:text-white/90 transition-colors tracking-wide">
              {['Features', 'How it works', 'Arena'][i]}
            </a>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {authUser && (
            <button
              onClick={handleSignOut}
              disabled={authLoading}
              className="hidden md:inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.07] hover:border-white/[0.15] bg-white/[0.03] hover:bg-white/[0.07]"
            >
              {authLoading ? '...' : 'Sign out'}
            </button>
          )}
          <button
            onClick={() => setMusicMuted(m => !m)}
            className="hidden md:inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.07] hover:border-white/[0.15] bg-white/[0.03] hover:bg-white/[0.07]"
            aria-pressed={musicMuted}
          >
            {musicMuted ? '🔇' : '🔊'} {musicMuted ? 'Off' : 'Music'}
          </button>
          <button
            onClick={authUser ? goToPlay : goToAuthPortal}
            disabled={authLoading}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all hover:-translate-y-px hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] active:translate-y-0"
          >
            {authUser ? `Continue as ${authUser.name.split(' ')[0]}` : 'Sign in'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            className="md:hidden text-white/60 hover:text-white text-xl p-1"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-40 bg-black/95 backdrop-blur-xl border-b border-white/[0.06] p-6 flex flex-col gap-5 md:hidden">
          {['#features', '#how', '#arena'].map((href, i) => (
            <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="text-white/60 hover:text-white text-base transition-colors">
              {['Features', 'How it works', 'Arena'][i]}
            </a>
          ))}
          <div className="flex gap-2 pt-2 border-t border-white/[0.07]">
            {authUser && (
              <button onClick={handleSignOut} disabled={authLoading} className="text-[13px] text-white/50 px-3 py-2 rounded-lg border border-white/[0.07] bg-white/[0.03]">
                {authLoading ? '...' : 'Sign out'}
              </button>
            )}
            <button onClick={() => setMusicMuted(m => !m)} className="text-[13px] text-white/50 px-3 py-2 rounded-lg border border-white/[0.07] bg-white/[0.03]">
              {musicMuted ? '🔇 Off' : '🔊 Music'}
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Grid bg */}
        <div className="hero-grid absolute inset-0 pointer-events-none" />

        {/* Blobs */}
        <div className="blob absolute w-[560px] h-[560px] rounded-full bg-violet-600/20 blur-[120px] -top-20 -left-32 pointer-events-none" />
        <div className="blob-2 absolute w-[400px] h-[400px] rounded-full bg-rose-600/15 blur-[100px] bottom-0 -right-20 pointer-events-none" />
        <div className="blob-3 absolute w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-[90px] top-1/2 left-1/2 pointer-events-none" />

        {/* Badge */}
        <div className="anim-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[11px] font-semibold tracking-widest uppercase mb-8">
          <span className="ticker-dot w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_#facc15]" />
          AI-Powered · Real-time · Free to play
        </div>

        {/* Headline */}
        <h1 className="anim-fade-up-1 font-syne font-extrabold text-[clamp(48px,8vw,100px)] leading-[0.95] tracking-[-3px] mb-6">
          <span className="text-white">Quiz battles.</span><br />
          <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">AI-generated.</span><br />
          <span className="bg-gradient-to-r from-rose-400 to-pink-500 bg-clip-text text-transparent">Epic vibes.</span>
        </h1>

        {/* Sub */}
        <p className="anim-fade-up-2 text-white/45 text-lg md:text-xl max-w-[500px] leading-relaxed font-light mb-10">
          Generate any quiz in seconds, invite your crew, and fight for the crown in real-time multiplayer arenas.
        </p>

        {/* CTAs */}
        <div className="anim-fade-up-3 flex flex-wrap gap-3 justify-center mb-16">
          <button
            onClick={authUser ? goToPlay : goToAuthPortal}
            disabled={authLoading}
            className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-[15px] transition-all hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] active:translate-y-0 disabled:opacity-50"
          >
            <span className="relative z-10">{authUser ? '🎮 Continue to Arena' : "⚡ Play now — it's free"}</span>
          </button>
          <button
            onClick={goToPlay}
            className="px-8 py-4 rounded-xl border border-white/10 text-white/70 font-semibold text-[15px] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 hover:text-white transition-all hover:-translate-y-1 active:translate-y-0"
          >
            Join as guest
          </button>
        </div>

        {/* Stats */}
        <div className="anim-fade-up-4 flex items-center gap-8 md:gap-12">
          {[
            { num: '10+', label: 'Players' },
            { num: '500+', label: 'Quizzes played' },
            { num: '<5s', label: 'To generate' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <div className="w-px h-8 bg-white/[0.08]" />}
              <div className="text-center">
                <div className="font-syne font-bold text-2xl text-white">{s.num}</div>
                <div className="text-[11px] text-white/30 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30">
          <div className="w-px h-8 bg-white/40" />
          <span className="text-[10px] tracking-widest uppercase text-white/60">Scroll</span>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="overflow-hidden border-y border-white/[0.06] bg-white/[0.02] py-4">
        <div className="marquee-track flex w-max">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-3 px-6 font-syne text-[12px] font-bold tracking-[2px] uppercase text-white/25 whitespace-nowrap">
              {item}
              <span className="text-yellow-400/60">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-black py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-[11px] tracking-[3px] uppercase text-violet-400 font-semibold mb-4">Features</div>
          <h2 className="font-syne font-extrabold text-[clamp(32px,5vw,56px)] tracking-tight text-white leading-tight mb-4">
            Built for the<br />ultimate battle
          </h2>
          <p className="text-white/40 text-lg font-light mb-16 max-w-md">
            Everything you need to host legendary quiz nights — straight in your browser.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
            {features.map((f) => (
              <div
                key={f.num}
                className="feat-card group relative bg-[#080810] p-8 hover:bg-[#0d0d1a] transition-colors"
              >
                <div className={`feat-num-text font-syne text-[11px] font-bold tracking-[2px] uppercase text-white/20 mb-5 transition-all`}>
                  {f.num}
                </div>
                <div className="font-syne font-bold text-[17px] text-white mb-3">{f.title}</div>
                <div className="text-[14px] text-white/40 leading-relaxed font-light">{f.desc}</div>
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="bg-[#06060e] border-y border-white/[0.05] py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-[11px] tracking-[3px] uppercase text-rose-400 font-semibold mb-4">How it works</div>
          <h2 className="font-syne font-extrabold text-[clamp(32px,5vw,56px)] tracking-tight text-white leading-tight mb-16">
            Four steps to<br />glory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="group relative">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" style={{ width: 'calc(100% - 48px)', left: '48px' }} />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-xl mb-5 group-hover:border-violet-500/40 group-hover:bg-violet-500/10 transition-all">
                    {s.icon}
                  </div>
                  <div className="text-[11px] font-bold tracking-widest text-white/20 uppercase mb-2 font-syne">Step {i + 1}</div>
                  <div className="font-syne font-bold text-[16px] text-white mb-2">{s.title}</div>
                  <div className="text-[13px] text-white/40 leading-relaxed font-light">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARENA SHOWCASE ── */}
      <section id="arena" className="bg-black py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-[11px] tracking-[3px] uppercase text-amber-400 font-semibold mb-4">The Arena</div>
          <h2 className="font-syne font-extrabold text-[clamp(32px,5vw,56px)] tracking-tight text-white leading-tight mb-16">
            Three moments<br />that hit different
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {showcase.map((s, i) => (
              <div
                key={i}
                className={`group relative rounded-2xl border ${s.border} bg-white/[0.03] hover:bg-white/[0.05] transition-all hover:-translate-y-1 hover:shadow-xl ${s.glow} overflow-hidden`}
              >
                <div className="p-7">
                  <div className="text-3xl mb-5">{s.icon}</div>
                  <div className="font-syne font-bold text-[20px] text-white mb-3">{s.title}</div>
                  <div className="text-[14px] text-white/40 leading-relaxed font-light">{s.desc}</div>
                </div>
                <div className={`px-7 py-3 border-t border-white/[0.06] flex items-center gap-2`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  <span className={`text-[11px] font-semibold tracking-wider uppercase ${s.badge.split(' ')[1]}`}>
                    {s.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-[#06060e] border-t border-white/[0.05] py-32 px-6 text-center">
        {/* Background glow */}
        <div className="absolute w-[700px] h-[300px] rounded-full bg-violet-700/10 blur-[120px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute w-[400px] h-[200px] rounded-full bg-rose-600/08 blur-[100px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/40 text-[11px] font-semibold tracking-widest uppercase mb-8">
            <span className="ticker-dot w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            Free forever
          </div>

          <h2 className="font-syne font-extrabold text-[clamp(40px,6vw,72px)] tracking-tight leading-[0.95] text-white mb-6">
            Ready to<br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
              enter the arena?
            </span>
          </h2>
          <p className="text-white/35 text-lg mb-10 font-light">
            Free forever. No download. Just pure competitive fun.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={authUser ? goToPlay : goToAuthPortal}
              disabled={authLoading}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-[15px] transition-all hover:-translate-y-1 hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] active:translate-y-0 disabled:opacity-50"
            >
              {authUser ? '🎮 Continue to Arena' : '⚡ Start playing now'}
            </button>
            <button
              onClick={goToPlay}
              className="px-10 py-4 rounded-xl border border-white/10 text-white/60 font-semibold text-[15px] bg-white/[0.04] hover:bg-white/[0.08] hover:text-white hover:border-white/20 transition-all hover:-translate-y-1 active:translate-y-0"
            >
              Join as guest
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-black border-t border-white/[0.06] px-6 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="font-syne font-extrabold text-[17px] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
          <span className="text-white">Quiz</span><span className="text-rose-500">Arena</span>
        </div>

        <div className="flex flex-wrap gap-6 justify-center">
          {['Features', 'About', 'Privacy', 'Terms'].map(link => (
            <a key={link} href="#" className="text-[13px] text-white/30 hover:text-white/70 transition-colors">
              {link}
            </a>
          ))}
        </div>

        <div className="text-[13px] text-white/25">Made with ❤️ from annu</div>
      </footer>
    </>
  );
};

export default App;