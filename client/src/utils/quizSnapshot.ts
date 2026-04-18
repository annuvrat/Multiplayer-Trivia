export type ReplayQuestion = {
  question: string;
  options: string[];
  answer: number;
};

/**
 * Normalizes Redis/DB quiz JSON (Gemini shape: question, options[], answer index).
 */
export function parseQuizSnapshot(raw: unknown): ReplayQuestion[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: ReplayQuestion[] = [];
  for (const q of raw) {
    if (!q || typeof q !== "object") continue;
    const o = q as Record<string, unknown>;
    const question = o.question;
    const options = o.options;
    const answer = o.answer;
    if (typeof question !== "string" || !Array.isArray(options)) continue;
    const opts = options.filter((x): x is string => typeof x === "string");
    if (opts.length === 0) continue;
    const ans = typeof answer === "number" ? answer : Number(answer);
    if (!Number.isFinite(ans)) continue;
    out.push({ question, options: opts, answer: ans });
  }
  return out.length > 0 ? out : null;
}
