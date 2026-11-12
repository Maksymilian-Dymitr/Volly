/**
 * Demo replacement for the backend's two WebSocket endpoints:
 *   /api/chat/ws    chat messages      (backend: modules/chat/chat.gateway.ts)
 *   /api/room/:id   WebRTC signalling  (backend: modules/video-chat/video-chat.ts)
 *
 * MSW intercepts the sockets inside this tab. Other tabs of the same browser
 * are reached over a BroadcastChannel, so two tabs logged in as two users
 * get real-time chat and a real peer-to-peer video call with no server at all.
 * Bot users (Sara, Omar) answer chats and calls by themselves.
 */
import { ws } from "msw";
import { wsUrl } from "../lib/api";
import {
  botInChat,
  chatRow,
  loadDb,
  messageWithEmail,
  nextId,
  updateDb,
  type DemoUser,
} from "./db";
import { userIdFromToken } from "./auth";
import { botReply, startBotCall } from "./bots";

export type Socket = {
  id: string;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
};

type ChannelMsg =
  | { t: "chat"; room: string; msg: unknown }
  | { t: "who"; room: string; from: string }
  | { t: "here"; room: string; to: string }
  | { t: "joined"; room: string }
  | { t: "signal"; room: string; data: string }
  | { t: "left"; room: string };

const channel = new BroadcastChannel("volly-demo");
const chatRooms = new Map<string, Set<Socket>>();
const videoRooms = new Map<string, Set<Socket>>();
const whoWaiters = new Map<string, () => void>();

const others = (rooms: Map<string, Set<Socket>>, room: string, me?: Socket) =>
  [...(rooms.get(room) ?? [])].filter((s) => s !== me);

const join = (rooms: Map<string, Set<Socket>>, room: string, s: Socket) => {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(s);
};

const leave = (rooms: Map<string, Set<Socket>>, room: string, s: Socket) => {
  rooms.get(room)?.delete(s);
  if (rooms.get(room)?.size === 0) rooms.delete(room);
};

const post = (msg: ChannelMsg) => channel.postMessage(msg);

channel.onmessage = (event: MessageEvent<ChannelMsg>) => {
  const m = event.data;
  switch (m.t) {
    case "chat":
      for (const s of others(chatRooms, m.room)) s.send(JSON.stringify(m.msg));
      break;
    case "who":
      if (videoRooms.get(m.room)?.size)
        post({ t: "here", room: m.room, to: m.from });
      break;
    case "here":
      whoWaiters.get(m.to)?.();
      break;
    case "joined":
      for (const s of others(videoRooms, m.room))
        s.send(JSON.stringify({ type: "peer-joined" }));
      break;
    case "signal":
      for (const s of others(videoRooms, m.room)) s.send(m.data);
      break;
    case "left":
      for (const s of others(videoRooms, m.room))
        s.send(JSON.stringify({ type: "peer-left" }));
      break;
  }
};

/** Counts peers in other tabs: they answer "who" within a short window. */
function countRemotePeers(room: string): Promise<number> {
  const from = crypto.randomUUID();
  let count = 0;
  whoWaiters.set(from, () => count++);
  post({ t: "who", room, from });
  return new Promise((resolve) =>
    setTimeout(() => {
      whoWaiters.delete(from);
      resolve(count);
    }, 300)
  );
}

/** Save a message and push it to everyone in the room, in every tab. */
export function deliverChatMessage(
  room: string,
  senderId: number,
  text: string,
  except?: Socket
) {
  const msg = updateDb((db) => {
    const m = {
      id: nextId(db),
      request_id: Number(room),
      sender_id: senderId,
      text_message: text,
      created_at: new Date().toISOString(),
    };
    db.messages.push(m);
    return messageWithEmail(db, m);
  });
  for (const s of others(chatRooms, room, except)) s.send(JSON.stringify(msg));
  post({ t: "chat", room, msg });
}

function acceptedParticipant(room: string, userId: number) {
  const db = loadDb();
  const r = db.requests.find((x) => x.id === Number(room));
  const chat = r && chatRow(db, r);
  if (!chat) return { error: "Chat not found" };
  if (userId !== chat.creator_id && userId !== chat.post_author_id)
    return { error: "Not a participant" };
  return { chat, bot: botInChat(db, chat.id, userId) as DemoUser | null };
}

const chatLink = ws.link(wsUrl("/api/chat/ws"));
const roomLink = ws.link(wsUrl("/api/room/:roomId"));

export const wsHandlers = [
  chatLink.addEventListener("connection", ({ client }) => {
    const q = new URL(client.url).searchParams;
    const userId = Number(q.get("userId"));
    const room = q.get("roomId") ?? "";
    const check = acceptedParticipant(room, userId);
    if ("error" in check) {
      client.close(1008, check.error);
      return;
    }
    join(chatRooms, room, client);

    client.addEventListener("message", (event) => {
      let text = "";
      try {
        text = String(JSON.parse(String(event.data)).text ?? "");
      } catch {
        return;
      }
      if (!text.trim()) return;
      const now = acceptedParticipant(room, userId);
      if ("error" in now || now.chat.status !== "accepted") {
        client.send(
          JSON.stringify({ type: "error", message: "Chat is not accepted" })
        );
        return;
      }
      deliverChatMessage(room, userId, text, client);
      if (now.bot) {
        const bot = now.bot;
        setTimeout(
          () => deliverChatMessage(room, bot.id, botReply(text, bot)),
          1200 + Math.random() * 1300
        );
      }
    });

    client.addEventListener("close", () => leave(chatRooms, room, client));
  }),

  roomLink.addEventListener("connection", async ({ client, params }) => {
    const room = String(params.roomId);
    const userId = userIdFromToken(
      new URL(client.url).searchParams.get("token")
    );
    const check = acceptedParticipant(room, userId);
    if ("error" in check) {
      client.close(1008, check.error);
      return;
    }
    if (check.chat.status !== "accepted") {
      client.close(1008, "Chat not accepted");
      return;
    }

    if (check.bot) {
      // The bot is "already in the room", so this tab calls it.
      startBotCall(client, check.bot);
      return;
    }

    const peers =
      (await countRemotePeers(room)) + others(videoRooms, room).length;
    if (peers >= 2) {
      client.send(JSON.stringify({ type: "room-full" }));
      client.close();
      return;
    }
    join(videoRooms, room, client);
    client.send(
      JSON.stringify({
        type: "room-joined",
        role: peers === 0 ? "waiter" : "caller",
      })
    );
    if (peers > 0) {
      for (const s of others(videoRooms, room, client))
        s.send(JSON.stringify({ type: "peer-joined" }));
      post({ t: "joined", room });
    }

    client.addEventListener("message", (event) => {
      const data = String(event.data);
      for (const s of others(videoRooms, room, client)) s.send(data);
      post({ t: "signal", room, data });
    });

    client.addEventListener("close", () => {
      leave(videoRooms, room, client);
      for (const s of others(videoRooms, room))
        s.send(JSON.stringify({ type: "peer-left" }));
      post({ t: "left", room });
    });
  }),
];
