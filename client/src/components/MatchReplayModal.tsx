import { useCallback, useEffect, useState } from "react";
import type { ReplayQuestion } from "../utils/quizSnapshot";

type MatchReplayModalProps = {
  open: boolean;
  onClose: () => void;
  roomLabel: string;
  topic?: string | null;
  difficulty?: string | null;
  questions: ReplayQuestion[];
};

export default function MatchReplayModal({
  open,
  onClose,
  roomLabel,
  topic,
  difficulty,
  questions,
}: MatchReplayModalProps) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setPicked(null);
    }
  }, [open, questions]);

  const q = questions[index];
  const total = questions.length;

  const goPrev = useCallback(() => {
    setPicked(null);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setPicked(null);
    setIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, goPrev, goNext]);

  if (!open || !q) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="replay-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1018] shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p id="replay-title" className="text-lg font-semibold text-slate-100">
              Replay · Room {roomLabel}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {[topic, difficulty].filter(Boolean).join(" · ") || "Saved quiz"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              Question {index + 1} / {total}
            </span>
            <span className="text-slate-600">Practice mode — no score</span>
          </div>

          <h2 className="text-xl font-semibold leading-snug text-slate-100 md:text-2xl">{q.question}</h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.answer;
              const isPicked = picked === i;
              let ring = "border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-white/[0.07]";
              if (picked !== null) {
                if (isCorrect) ring = "border-emerald-500/60 bg-emerald-500/15";
                else if (isPicked && !isCorrect) ring = "border-red-500/50 bg-red-500/10";
                else ring = "border-white/5 bg-white/[0.02] opacity-60";
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => setPicked(i)}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm text-slate-200 transition ${ring} disabled:cursor-default`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-slate-300">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 pt-0.5">{opt}</span>
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <p className="mt-4 text-sm text-slate-400">
              {picked === q.answer ? (
                <span className="text-emerald-400">Correct.</span>
              ) : (
                <>
                  <span className="text-red-400">Incorrect.</span> Answer:{" "}
                  <span className="text-slate-200">{q.options[q.answer]}</span>
                </>
              )}
            </p>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <div className="text-xs text-slate-500">← → keys · Esc to close</div>
          <button
            type="button"
            onClick={goNext}
            disabled={index >= total - 1}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </footer>
      </div>
    </div>
  );
}
