import { setupWorker } from "msw/browser";
import { httpHandlers } from "./handlers";
import { wsHandlers } from "./realtime";

export const worker = setupWorker(...httpHandlers, ...wsHandlers);

export async function startDemoBackend() {
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });
}
