import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getMode, isServerOnline } from "../lib/mode";
import { authStorage, saveToken } from "../utils/auth";

const DEMO_PASSWORD = "VollyDemo2026";
const ACCOUNTS = [
  { name: "Anna", email: "demo.anna@volly.se" },
  { name: "Erik", email: "demo.erik@volly.se" },
];
const SEEN_KEY = "volly-banner-seen";

async function quickLogin(email: string) {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  if (!res.ok) return;
  const data = await res.json();
  saveToken(data.token);
  authStorage.setItem("currentUser", email);
  authStorage.setItem("isAdmin", String(data.is_admin === true));
  authStorage.setItem("userId", String(data.id));
  authStorage.removeItem("needsOnboarding");
  window.location.reload();
}

function reloadWithoutParams() {
  window.location.href = window.location.pathname;
}

/**
 * Small floating chip that says whether the app talks to the real server
 * or the in-browser demo backend, with one-click demo logins.
 */
export default function ModeBanner() {
  const mode = getMode();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [serverOnline, setServerOnline] = useState(false);
  const loggedInAs = authStorage.getItem("currentUser");

  useEffect(() => {
    if (open) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, [open]);

  // In demo mode, keep checking whether the real server has been started.
  useEffect(() => {
    if (mode !== "demo") return;
    let alive = true;
    const check = async () => {
      const online = await isServerOnline();
      if (alive) setServerOnline(online);
    };
    check();
    const timer = setInterval(check, 20_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [mode]);

  const isDemo = mode === "demo";
  const dot = isDemo ? "bg-amber-400" : "bg-primary";

  return (
    <div className="fixed left-1/2 top-2 z-[1000] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 text-sm">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1 font-semibold text-foreground shadow-soft backdrop-blur hover:bg-muted"
        >
          <span
            className={`size-2 rounded-full ${dot} ${serverOnline ? "animate-pulse" : ""}`}
          />
          {isDemo ? "Demo mode" : "Live server"}
          {isDemo && serverOnline && (
            <span className="rounded-full bg-primary px-2 text-xs text-white">
              server online
            </span>
          )}
          <span className="text-muted-foreground">{open ? "▴" : "▾"}</span>
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-3 rounded-2xl border border-border bg-card p-4 text-foreground shadow-soft">
          {isDemo ? (
            <p>
              The backend is <strong>simulated in your browser</strong> (Mock
              Service Worker), so this demo works 24/7. Chat and video still run
              in real time: <strong>Sara</strong> is a bot that replies and
              takes video calls, and two tabs logged in as Anna and Erik can
              chat and call each other.
            </p>
          ) : (
            <p>
              Connected to the <strong>real backend</strong>: Fastify, Postgres,
              WebSockets and WebRTC with a TURN relay. Log in as Anna here and
              as Erik on another device to chat and video-call. Data resets when
              the server restarts.
            </p>
          )}

          {isDemo && serverOnline && (
            <button
              type="button"
              onClick={reloadWithoutParams}
              className="w-full rounded-full bg-primary px-4 py-2 font-semibold text-white hover:opacity-90"
            >
              The live server is online: switch to it
            </button>
          )}

          {loggedInAs ? (
            <p className="text-muted-foreground">
              Logged in as {loggedInAs} in this tab.{" "}
              {isDemo && "Open a new tab to log in as someone else."}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Log in as</span>
              {ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => quickLogin(a.email)}
                  className="rounded-full border border-border px-3 py-1 font-semibold hover:bg-muted"
                >
                  {a.name}
                </button>
              ))}
              <span className="text-xs text-muted-foreground">
                (password {DEMO_PASSWORD})
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {isDemo ? (
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={async () => {
                  const { resetDb } = await import("../demo/db");
                  resetDb();
                  window.location.reload();
                }}
              >
                Reset demo data
              </button>
            ) : (
              <a className="underline hover:text-foreground" href="?demo=1">
                Show the offline demo instead
              </a>
            )}
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Hide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
