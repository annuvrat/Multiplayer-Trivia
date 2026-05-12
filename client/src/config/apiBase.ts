const envBase = import.meta.env.VITE_API_BASE_URL?.trim();

const isLocalHost = typeof window !== "undefined"
  && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

/**
 * In production, avoid hard-falling back to localhost.
 * If no env var is provided, use relative URLs (same-origin) so deployments
 * can still work behind a reverse proxy.
 */
export const API_BASE_URL = envBase || (isLocalHost ? "http://localhost:5000" : "");
