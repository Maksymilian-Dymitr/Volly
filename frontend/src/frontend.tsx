/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import appRouter from "./routes/AppRouter";
import ModeBanner from "./components/ModeBanner";
import { detectMode } from "./lib/mode";
import "./index.css";

// Live server reachable? Use it. Otherwise start the in-browser demo backend
// before the app renders, so its very first requests are already handled.
if ((await detectMode()) === "demo") {
  const { startDemoBackend } = await import("./demo/browser");
  await startDemoBackend();
}

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <ModeBanner />
    <RouterProvider router={appRouter()} />
  </StrictMode>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
