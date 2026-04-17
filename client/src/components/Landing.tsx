import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getFreshIdToken,
  onFirebaseAuthStateChange,
  signOutFirebase,
  type FirebaseGoogleUser,
} from '../firebase/FireBase';

const BG_MUSIC_SRC = '/sounds/bg_music.mp3';
/** Background music level (0–1). Kept moderate so it sits under UI. */
const BG_MUSIC_VOLUME = 0.18;
const AUTH_USER_STORAGE_KEY = 'quizme-google-user';
const AUTH_TOKEN_STORAGE_KEY = 'quizme-google-token';
const BACKEND_AUTH_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const MARQUEE_ITEMS = [
  'AI Quiz Generation', 'Live Leaderboard', 'Team Mode', 'Power-ups',
  'Lobby Chat', 'Champion Reveal', 'Sound Effects', '50+ Topics', 'Custom Difficulty',
];

const features = [
  { num: '01', title: 'AI Quiz Engine', desc: 'Any topic, any difficulty, any length — generated in under 3 seconds by Claude.' },
  { num: '02', title: 'Real-time Multiplayer', desc: 'Create rooms and battle live. Share a link — friends join instantly, no account needed.' },
  { num: '03', title: 'Live Leaderboard', desc: 'Rankings update in real-time with score animations and killer audio feedback.' },
  { num: '04', title: 'Team Mode', desc: 'Split into squads, strategize in lobby chat, and deploy power-ups to dominate.' },
  { num: '05', title: 'Player Dashboard', desc: 'Track wins, streaks, and performance across every topic you\'ve tackled.' },
  { num: '06', title: 'Champion Reveal', desc: 'Epic end-screen animations and customizable victory sounds for the winner.' },
];

const steps = [
  { title: 'Create a room', desc: 'Start a new game or join with a room code. No download, no setup.' },
  { title: 'Generate your quiz', desc: 'Pick topic, difficulty, and question count. AI does the rest in seconds.' },
  { title: 'Invite & strategize', desc: 'Share the link and talk trash in the lobby — then gear up for battle.' },
  { title: 'Claim the crown', desc: 'Answer fast, climb the leaderboard, and become the undisputed champion.' },
];

const showcase = [
  { icon: '💬', color: 'purple', title: 'Lobby Chat', desc: 'Team up, talk tactics, or just roast each other before the countdown hits zero.', tag: 'Room fills → chat unlocks' },
  { icon: '⚔️', color: 'red', title: 'Live Arena', desc: 'Every correct answer rockets you up the leaderboard. Every second counts.', tag: 'Real-time rank updates' },
  { icon: '👑', color: 'gold', title: 'Champion Reveal', desc: 'The winner gets their moment. Confetti, sound, and a crown that can\'t be disputed.', tag: 'Epic end-game screen' },
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  :root {
    --ink: #0f0e17;
    --ink2: #161525;
    --ink3: #1c1b2e;
    --ink4: #2a2840;
    --surface: #161525;
    --muted: #6b6880;
    --bright: #f5f4f8;
    --accent1: #7c6af7;
    --accent2: #e8554e;
    --accent3: #f5c842;
    --accent4: #3ecf8e;
    --border: rgba(255,255,255,0.08);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: var(--ink); font-family: 'DM Sans', sans-serif; color: var(--bright); overflow-x: hidden; }

  /* NAV */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 40px;
    background: rgba(15,14,23,0.75);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }
  .nav-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 20px; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
  .logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent3); }
  .nav-links { display: flex; align-items: center; gap: 36px; }
  .nav-links a { font-size: 14px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .nav-links a:hover { color: var(--bright); }
  .nav-tools { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .mobile-menu-btn { display: none; background: none; border: none; color: var(--bright); font-size: 22px; cursor: pointer; padding: 4px; line-height: 1; }
  .nav-cta {
    padding: 9px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
    background: var(--accent1); color: #fff; border: none; cursor: pointer;
    transition: background 0.2s, transform 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .nav-cta:hover { background: #9181f9; transform: translateY(-1px); }
  .nav-mute {
    padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
    background: rgba(255,255,255,0.06); color: var(--bright); border: 1px solid var(--border);
    cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.2s, border-color 0.2s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .nav-mute:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.15); }

  /* HERO */
  .hero {
    min-height: 100vh; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; padding: 120px 32px 80px;
    position: relative; overflow: hidden;
  }
  .hero-bg { position: absolute; inset: 0; pointer-events: none; }
  .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35; animation: drift 8s ease-in-out infinite; }
  .blob1 { width: 480px; height: 480px; background: var(--accent1); top: -100px; left: -120px; animation-delay: 0s; }
  .blob2 { width: 360px; height: 360px; background: var(--accent2); bottom: -80px; right: -100px; animation-delay: -4s; }
  .blob3 { width: 280px; height: 280px; background: var(--accent3); top: 40%; left: 55%; animation-delay: -2s; opacity: 0.2; }

  @keyframes drift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -20px) scale(1.05); }
    66% { transform: translate(-20px, 20px) scale(0.97); }
  }

  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(124,106,247,0.15); border: 1px solid rgba(124,106,247,0.35);
    border-radius: 100px; padding: 6px 16px;
    font-size: 12px; font-weight: 500; color: #b8b0fb; letter-spacing: 0.5px;
    text-transform: uppercase; margin-bottom: 32px;
    animation: fadein 0.6s ease both;
  }
  .badge-blink { width: 6px; height: 6px; border-radius: 50%; background: var(--accent3); animation: blink 1.2s infinite; }
  @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0.3 } }

  .hero-headline {
    font-family: 'Syne', sans-serif; font-weight: 800;
    font-size: clamp(44px, 7vw, 92px); line-height: 1.0;
    letter-spacing: -2.5px; margin-bottom: 24px;
    animation: fadein 0.7s ease 0.1s both;
  }
  .hl-white { color: var(--bright); }
  .hl-purple { color: var(--accent1); }
  .hl-red { color: var(--accent2); }

  .hero-sub {
    font-size: 18px; color: var(--muted); max-width: 520px; line-height: 1.7;
    margin-bottom: 48px; font-weight: 300;
    animation: fadein 0.7s ease 0.2s both;
  }
  .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; animation: fadein 0.7s ease 0.3s both; }
  .btn-primary {
    padding: 16px 32px; border-radius: 10px; font-size: 15px; font-weight: 500;
    background: var(--accent1); color: #fff; border: none; cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s; font-family: 'DM Sans', sans-serif;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(124,106,247,0.4); }
  .btn-ghost {
    padding: 16px 32px; border-radius: 10px; font-size: 15px; font-weight: 500;
    background: transparent; color: var(--bright); border: 1px solid var(--border);
    cursor: pointer; transition: border-color 0.2s, background 0.2s; font-family: 'DM Sans', sans-serif;
  }
  .btn-ghost:hover { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.05); }

  .hero-meta { margin-top: 60px; display: flex; gap: 40px; justify-content: center; animation: fadein 0.7s ease 0.4s both; }
  .meta-item { text-align: center; }
  .meta-num { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 700; color: var(--bright); }
  .meta-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  .meta-sep { width: 1px; background: var(--border); }

  @keyframes fadein { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }

  /* MARQUEE */
  .marquee-wrap {
    overflow: hidden; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
    padding: 18px 0; background: var(--ink3);
  }
  .marquee { display: flex; animation: scroll 28s linear infinite; width: max-content; }
  .marquee-item { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 0 32px; color: var(--muted); white-space: nowrap; }
  .marquee-item span { color: var(--accent3); margin: 0 12px; }
  @keyframes scroll { from { transform:translateX(0) } to { transform:translateX(-50%) } }

  /* SECTIONS */
  .section { padding: 100px 40px; max-width: 1160px; margin: 0 auto; }
  .section-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent1); font-weight: 500; margin-bottom: 14px; }
  .section-title { font-family: 'Syne', sans-serif; font-size: clamp(32px, 4vw, 52px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 16px; }
  .section-sub { font-size: 17px; color: var(--muted); max-width: 480px; line-height: 1.7; font-weight: 300; }

  /* FEATURES */
  .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-top: 64px; border: 2px solid var(--border); border-radius: 16px; overflow: hidden; }
  .feat-card { padding: 36px 32px; background: var(--surface); position: relative; transition: background 0.25s; }
  .feat-card:hover { background: var(--ink4); }
  .feat-card::after { content:''; position:absolute; top:0; right:0; bottom:0; width:2px; background: var(--border); }
  .feat-card:nth-child(3n)::after { display:none; }
  .feat-card::before { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background: var(--border); }
  .feat-card:nth-child(n+4)::before { display:none; }
  .feat-num { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: 1px; margin-bottom: 12px; }
  .feat-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 10px; }
  .feat-desc { font-size: 14px; color: var(--muted); line-height: 1.7; font-weight: 300; }

  /* STEPS */
  .steps-section { background: var(--ink3); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .steps-inner { padding: 100px 40px; max-width: 1160px; margin: 0 auto; }
  .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 64px; }
  .step-card { padding: 36px 28px; position: relative; }
  .step-card:not(:last-child)::after { content:''; position:absolute; top: 56px; right: -1px; width:2px; height:40px; background: var(--border); }
  .step-num {
    width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700;
    margin-bottom: 22px; color: var(--bright); background: var(--ink);
    transition: border-color 0.2s, background 0.2s;
  }
  .step-card:hover .step-num { border-color: var(--accent1); background: rgba(124,106,247,0.15); }
  .step-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; margin-bottom: 10px; }
  .step-desc { font-size: 14px; color: var(--muted); line-height: 1.7; font-weight: 300; }

  /* SHOWCASE */
  .showcase-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 64px; }
  .show-card {
    border: 1px solid var(--border); border-radius: 14px;
    background: var(--surface); overflow: hidden;
    transition: border-color 0.2s, transform 0.2s;
  }
  .show-card:hover { border-color: rgba(124,106,247,0.4); transform: translateY(-4px); }
  .show-top { padding: 32px; }
  .show-icon-wrap { width: 56px; height: 56px; border-radius: 14px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
  .show-icon-wrap.purple { background: rgba(124,106,247,0.15); }
  .show-icon-wrap.red { background: rgba(232,85,78,0.15); }
  .show-icon-wrap.gold { background: rgba(245,200,66,0.15); }
  .show-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  .show-desc { font-size: 14px; color: var(--muted); line-height: 1.6; }
  .show-bottom { padding: 16px 32px; border-top: 1px solid var(--border); font-size: 12px; color: var(--muted); letter-spacing: 0.5px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
  .show-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent4); flex-shrink: 0; }

  /* CTA */
  .cta-section { padding: 100px 40px; text-align: center; position: relative; overflow: hidden; }
  .cta-bg { position: absolute; inset: 0; pointer-events: none; }
  .cta-blob { position: absolute; width: 600px; height: 300px; border-radius: 50%; filter: blur(80px); opacity: 0.12; background: var(--accent1); left: 50%; top: 50%; transform: translate(-50%,-50%); }
  .cta-title { font-family: 'Syne', sans-serif; font-size: clamp(36px, 5vw, 64px); font-weight: 800; letter-spacing: -2px; margin-bottom: 24px; line-height: 1.05; position: relative; }
  .cta-sub { font-size: 17px; color: var(--muted); margin-bottom: 40px; font-weight: 300; position: relative; }
  .cta-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; position: relative; }

  /* FOOTER */
  .footer {
    border-top: 1px solid var(--border); padding: 48px 40px;
    display: flex; align-items: center; justify-content: space-between;
    background: var(--ink);
  }
  .footer-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px; display: flex; align-items: center; gap: 8px; }
  .footer-links { display: flex; gap: 28px; }
  .footer-links a { font-size: 13px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .footer-links a:hover { color: var(--bright); }
  .footer-copy { font-size: 13px; color: var(--muted); }

  @media (max-width: 900px) {
    .nav { padding: 14px 20px; }
    .nav-links { display: none; }
    .mobile-menu-btn { display: block; }
    .hero { padding: 100px 20px 60px; }
    .hero-meta { gap: 24px; }
    .features-grid { grid-template-columns: 1fr; }
    .steps-grid { grid-template-columns: 1fr 1fr; }
    .showcase-grid { grid-template-columns: 1fr; }
    .section { padding: 64px 20px; }
    .steps-inner { padding: 64px 20px; }
    .footer { flex-direction: column; gap: 20px; text-align: center; }
    .footer-links { flex-wrap: wrap; justify-content: center; }
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
    try {
      return JSON.parse(raw) as FirebaseGoogleUser;
    } catch {
      return null;
    }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicMutedRef = useRef(musicMuted);
  musicMutedRef.current = musicMuted;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.volume = BG_MUSIC_VOLUME;

    if (musicMuted) {
      el.pause();
      return;
    }

    const tryPlay = () => {
      el.volume = BG_MUSIC_VOLUME;
      return el.play();
    };

    let cancelled = false;
    const unlock = () => {
      if (cancelled || musicMutedRef.current) return;
      void tryPlay();
    };

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
    const unsub = onFirebaseAuthStateChange((user) => {
      setAuthUser(user);
    });
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
        await fetch(`${BACKEND_AUTH_BASE_URL}/auth/google/signout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  const marqueeContent = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
    <span key={i} className="marquee-item">
      {item} <span>✦</span>
    </span>
  ));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <audio ref={audioRef} src={BG_MUSIC_SRC} autoPlay playsInline loop preload="auto" hidden />

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">
          <div className="logo-dot" />
          QuizArena
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#arena">Arena</a>
          <button className="nav-cta" onClick={authUser ? goToPlay : goToAuthPortal} disabled={authLoading}>
            {authUser ? `Continue as ${authUser.name.split(' ')[0]}` : 'Sign in'}
          </button>
        </div>
        <div className="nav-tools">
          {authUser ? (
            <button
              type="button"
              className="nav-mute"
              onClick={handleSignOut}
              disabled={authLoading}
              aria-label="Sign out"
            >
              {authLoading ? '...' : 'Sign out'}
            </button>
          ) : null}
          <button
            type="button"
            className="nav-mute"
            onClick={() => setMusicMuted((m) => !m)}
            aria-pressed={musicMuted}
            aria-label={musicMuted ? 'Unmute background music' : 'Mute background music'}
          >
            {musicMuted ? '🔇 Music off' : '🔊 Mute music'}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <div className="blob blob1" />
          <div className="blob blob2" />
          <div className="blob blob3" />
        </div>

        <div className="hero-badge">
          <div className="badge-blink" />
          AI-Powered · Real-time · Free to play
        </div>

        <h1 className="hero-headline">
          <span className="hl-white">Quiz battles.</span><br />
          <span className="hl-purple">AI-generated.</span><br />
          <span className="hl-red">Epic vibes.</span>
        </h1>

        <p className="hero-sub">
          Generate any quiz in seconds, invite your crew, and fight for the crown in real-time multiplayer arenas.
        </p>

        <div className="hero-actions">
          <button className="btn-primary" onClick={authUser ? goToPlay : goToAuthPortal} disabled={authLoading}>
            {authUser ? 'Continue to Arena' : "Play now — it's free"}
          </button>
          <button className="btn-ghost" onClick={goToPlay}>Join as guest</button>
        </div>

        <div className="hero-meta">
          <div className="meta-item">
            <div className="meta-num">10+</div>
            <div className="meta-label">Players</div>
          </div>
          <div className="meta-sep" />
          <div className="meta-item">
            <div className="meta-num">500+</div>
            <div className="meta-label">Quizzes played</div>
          </div>
          <div className="meta-sep" />
          <div className="meta-item">
            <div className="meta-num">&lt;5s</div>
            <div className="meta-label">To generate</div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-wrap">
        <div className="marquee">{marqueeContent}</div>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ background: 'var(--ink)' }}>
        <div className="section">
          <div className="section-label">Features</div>
          <div className="section-title">Built for the<br />ultimate battle</div>
          <div className="section-sub">Everything you need to host legendary quiz nights — straight in your browser.</div>
          <div className="features-grid">
            {features.map((f) => (
              <div key={f.num} className="feat-card">
                <div className="feat-num">{f.num}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="steps-section">
        <div className="steps-inner">
          <div className="section-label">How it works</div>
          <div className="section-title">Four steps to<br />glory</div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-num">{i + 1}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARENA SHOWCASE */}
      <section id="arena" style={{ background: 'var(--ink)' }}>
        <div className="section">
          <div className="section-label">The Arena</div>
          <div className="section-title">Three moments<br />that hit different</div>
          <div className="showcase-grid">
            {showcase.map((s, i) => (
              <div key={i} className="show-card">
                <div className="show-top">
                  <div className={`show-icon-wrap ${s.color}`}>{s.icon}</div>
                  <div className="show-title">{s.title}</div>
                  <div className="show-desc">{s.desc}</div>
                </div>
                <div className="show-bottom">
                  <div className="show-dot" />
                  {s.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-bg"><div className="cta-blob" /></div>
        <div className="cta-title">Ready to<br />enter the arena?</div>
        <div className="cta-sub">Free forever. No download. Just pure competitive fun.</div>
        <div className="cta-actions">
          <button className="btn-primary" onClick={authUser ? goToPlay : goToAuthPortal} disabled={authLoading}>
            {authUser ? 'Continue to Arena' : 'Start playing now'}
          </button>
          <button className="btn-ghost" onClick={goToPlay}>Join as guest</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">
          <div className="logo-dot" />
          QuizArena
        </div>
        <div className="footer-links">
          <a href="#">Features</a>
          <a href="#">About</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
        <div className="footer-copy">Made with ❤️ from annu</div>
      </footer>
    </>
  );
};

export default App;