import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  onFirebaseAuthStateChange,
  signInWithGooglePopup,
  type FirebaseGoogleUser,
} from "../firebase/FireBase";

const AUTH_USER_STORAGE_KEY = "quizme-google-user";
const AUTH_TOKEN_STORAGE_KEY = "quizme-google-token";
const BACKEND_AUTH_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function sanitizeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/play";
  if (!rawNext.startsWith("/")) return "/play";
  if (rawNext.startsWith("//")) return "/play";
  return rawNext;
}

export default function AuthPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authLoading, setAuthLoading] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseGoogleUser | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const nextPath = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return sanitizeNextPath(searchParams.get("next"));
  }, [location.search]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    type GlowDot = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      twinkle: number;
      twinkleSpeed: number;
      hue: "cyan" | "violet";
    };

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let dpr = 1;

    const dotCount = 70;
    const dots: GlowDot[] = [];

    const createDot = (): GlowDot => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.12 + Math.random() * 0.38;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 0.9 + Math.random() * 1.8,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.015 + Math.random() * 0.03,
        hue: Math.random() > 0.5 ? "cyan" : "violet",
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    for (let i = 0; i < dotCount; i += 1) dots.push(createDot());

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        dot.twinkle += dot.twinkleSpeed;

        if (dot.x < -8) dot.x = width + 8;
        if (dot.x > width + 8) dot.x = -8;
        if (dot.y < -8) dot.y = height + 8;
        if (dot.y > height + 8) dot.y = -8;

        const pulse = (Math.sin(dot.twinkle) + 1) / 2;
        const glowAlpha = 0.09 + pulse * 0.22;
        const coreAlpha = 0.22 + pulse * 0.45;
        const glowRadius = dot.radius * (2.6 + pulse * 1.6);
        const coreRadius = dot.radius * (0.9 + pulse * 0.35);
        const glowColor = dot.hue === "cyan" ? `rgba(56, 189, 248, ${glowAlpha})` : `rgba(167, 139, 250, ${glowAlpha})`;
        const coreColor = dot.hue === "cyan" ? `rgba(125, 211, 252, ${coreAlpha})` : `rgba(196, 181, 253, ${coreAlpha})`;

        context.fillStyle = glowColor;
        context.beginPath();
        context.arc(dot.x, dot.y, glowRadius, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = coreColor;
        context.beginPath();
        context.arc(dot.x, dot.y, coreRadius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalCompositeOperation = "source-over";

      animationFrame = window.requestAnimationFrame(draw);
    };

    animationFrame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const verifyWithBackend = async (token: string) => {
    const authRes = await fetch(`${BACKEND_AUTH_BASE_URL}/auth/google/session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!authRes.ok) {
      const details = await authRes.json().catch(() => null);
      throw new Error(details?.error || "Backend token verification failed");
    }
  };

  const handleGoogleAuth = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    try {
      const user = await signInWithGooglePopup();
      await verifyWithBackend(user.idToken);
      setAuthUser(user);
      toast.success(`Signed in as ${user.name}`);
      navigate(`/go?next=${encodeURIComponent(nextPath)}`, { replace: true });
    } catch (error) {
      console.error("Google sign in failed:", error);
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05080f] text-slate-100">
      <div
        aria-hidden
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage:
            "radial-gradient(rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "6px 6px, 64px 64px, 64px 64px",
          backgroundPosition: "0 0, 0 0, 0 0",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.12),transparent_45%)]" />
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 opacity-70" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11151f]/90 p-7 shadow-2xl shadow-black/50 backdrop-blur-md">
          <p className="text-center text-xl font-semibold tracking-tight">QuizArena</p>
          <p className="mt-1 text-center text-xs text-slate-400">Welcome back! Sign in to continue</p>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={authLoading}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-md bg-white px-4 text-base font-medium text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.251-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.8 2.716v2.258h2.908c1.702-1.567 2.688-3.874 2.688-6.614z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.711A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.711V4.957H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.043l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.578c1.321 0 2.507.454 3.44 1.345l2.581-2.581C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.957l3.007 2.332C4.672 5.162 6.656 3.578 9 3.578z" />
            </svg>
            {authLoading ? "Verifying..." : authUser ? "Continue with Google" : "Sign in with Google"}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/go?next=${encodeURIComponent("/play")}`)}
            className="mt-3 h-11 w-full rounded-md border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Continue as Guest
          </button>

          <div className="mt-5 text-center text-[11px] text-slate-500">
            You will be redirected to <span className="text-slate-300">{nextPath}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
