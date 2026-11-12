import { apiUrl } from "./api";
import { authStorage, clearAuth } from "../utils/auth";

/**
 * "live": the real backend answered the health check.
 * "demo": no backend reachable, so a simulated backend runs in the browser (see src/demo).
 */
export type AppMode = "live" | "demo";

const MODE_KEY = "volly-mode";
let currentMode: AppMode = "live";

export function getMode(): AppMode {
  return currentMode;
}

export async function isServerOnline(timeoutMs = 2500): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/chat/health"), {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** ?demo=1 forces demo mode, ?live=1 skips the check. */
export async function detectMode(): Promise<AppMode> {
  const params = new URLSearchParams(window.location.search);
  if (params.has("demo")) currentMode = "demo";
  else if (params.has("live")) currentMode = "live";
  else currentMode = (await isServerOnline()) ? "live" : "demo";

  // A demo login token means nothing to the real server (and vice versa).
  const previous = authStorage.getItem(MODE_KEY);
  if (previous && previous !== currentMode) {
    clearAuth();
    authStorage.removeItem("needsOnboarding");
  }
  authStorage.setItem(MODE_KEY, currentMode);
  return currentMode;
}
