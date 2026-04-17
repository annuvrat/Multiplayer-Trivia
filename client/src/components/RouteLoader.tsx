import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function sanitizeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/";
  if (!rawNext.startsWith("/")) return "/";
  if (rawNext.startsWith("//")) return "/";
  return rawNext;
}

export default function RouteLoader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(0);

  const nextPath = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return sanitizeNextPath(searchParams.get("next"));
  }, [location.search]);

  useEffect(() => {
    const durationMs = 1000;
    setProgress(0);
    const frameId = window.requestAnimationFrame(() => {
      setProgress(100);
    });
    const timerId = window.setTimeout(() => {
      navigate(nextPath, { replace: true });
    }, durationMs + 100);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
    };
  }, [navigate, nextPath]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_45%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-300/80 shadow-[0_0_18px_rgba(103,232,249,0.55)] transition-[width] duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
