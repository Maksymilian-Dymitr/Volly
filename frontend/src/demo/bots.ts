/**
 * Demo bots: canned chat replies, and a video-call peer whose "camera"
 * is an animated canvas. The call itself is a real RTCPeerConnection
 * negotiated over the same signalling messages the backend relays.
 */
import type { ws } from "msw";
import type { DemoUser } from "./db";

type ConnectionListener = Parameters<
  ReturnType<typeof ws.link>["addEventListener"]
>[1];
export type WsClient = Parameters<ConnectionListener>[0]["client"];

const REPLIES = [
  "Vad roligt att du hör av dig! Berätta mer 😊",
  "Absolut, det kan jag hjälpa till med.",
  "Bra fråga! Vi kan gå igenom det steg för steg.",
  "Ring gärna med videoknappen så visar jag hur jag menar.",
  "Jag har en stund nu, vad behöver du hjälp med först?",
  "Toppen, då säger vi så! 👍",
];

export function botReply(text: string, bot: DemoUser): string {
  const t = text.toLowerCase();
  if (/\b(hej|hallå|tjena|hi|hello)\b/.test(t))
    return `Hej! ${bot.first_name} här, vad kul att du skriver.`;
  if (t.includes("?")) return REPLIES[2];
  if (/\b(tack|thanks)\b/.test(t)) return "Varsågod! Hör av dig när du vill.";
  return REPLIES[Math.floor(Math.random() * REPLIES.length)];
}

/** An animated avatar drawn on a canvas, captured as a video track. */
function botCamera(bot: DemoUser) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d")!;
  const initials = `${bot.first_name?.[0] ?? ""}${bot.last_name?.[0] ?? ""}`;
  const start = performance.now();

  const draw = () => {
    const t = (performance.now() - start) / 1000;
    const g = ctx.createLinearGradient(0, 0, 640, 480);
    g.addColorStop(0, "#113714");
    g.addColorStop(1, "#00ab46");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 640, 480);

    // "speaking" rings
    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.8 + i / 3) % 1;
      ctx.beginPath();
      ctx.arc(320, 210, 90 + phase * 90, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(211, 251, 213, ${0.5 * (1 - phase)})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(320, 210 + Math.sin(t * 2) * 4, 90, 0, Math.PI * 2);
    ctx.fillStyle = "#fdfaf4";
    ctx.fill();
    ctx.fillStyle = "#113714";
    ctx.font = "bold 72px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, 320, 214 + Math.sin(t * 2) * 4);

    ctx.fillStyle = "#fdfaf4";
    ctx.font = "600 28px 'DM Sans', sans-serif";
    ctx.fillText(`${bot.first_name} ${bot.last_name}`, 320, 370);
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.fillStyle = "rgba(253, 250, 244, 0.75)";
    ctx.fillText("Demo-bot · live WebRTC-ström", 320, 405);
    ctx.fillText(new Date().toLocaleTimeString("sv-SE"), 320, 435);
  };

  draw();
  const timer = setInterval(draw, 1000 / 24);
  const stream = canvas.captureStream(24);
  return {
    stream,
    stop: () => {
      clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

/**
 * The bot is already "in the room", so the visitor's tab is the caller:
 * it sends an offer once its own camera is ready and the bot answers.
 */
export function startBotCall(client: WsClient, bot: DemoUser) {
  let pc: RTCPeerConnection | null = null;
  let stopCamera = () => {};
  const pendingIce: RTCIceCandidateInit[] = [];
  const send = (msg: unknown) => client.send(JSON.stringify(msg));

  send({ type: "room-joined", role: "caller" });

  client.addEventListener("message", async (event) => {
    let msg: {
      type?: string;
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    };
    try {
      msg = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (msg.type === "offer" && msg.sdp) {
      pc?.close();
      stopCamera();
      pc = new RTCPeerConnection();
      const camera = botCamera(bot);
      stopCamera = camera.stop;
      camera.stream
        .getTracks()
        .forEach((track) => pc!.addTrack(track, camera.stream));
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: "ice", candidate: e.candidate });
      };
      await pc.setRemoteDescription(msg.sdp);
      for (const c of pendingIce.splice(0))
        await pc.addIceCandidate(c).catch(() => {});
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "answer", sdp: answer });
    }

    if (msg.type === "ice" && msg.candidate) {
      if (pc?.remoteDescription)
        await pc.addIceCandidate(msg.candidate).catch(() => {});
      else pendingIce.push(msg.candidate);
    }
  });

  client.addEventListener("close", () => {
    pc?.close();
    stopCamera();
  });
}
