/**
 * Where the backend lives. Empty = same origin (local dev with the Vite proxy).
 * On Netlify this is set to the public backend, e.g. https://qubit.tail96100a.ts.net:10000
 */
export const API_BASE = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? ""
).replace(/\/$/, "");

/** Full URL for an HTTP API path like "/api/posts". */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Full ws:// or wss:// URL for a WebSocket API path. */
export function wsUrl(path: string): string {
  const base = API_BASE || window.location.origin;
  return base.replace(/^http/, "ws") + path;
}
