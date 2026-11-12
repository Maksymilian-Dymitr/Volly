/**
 * Demo copies of the backend's HTTP routes. Response shapes match the real
 * controllers in Backend/src/modules so the app code doesn't know the difference.
 * /api/chat/health is deliberately NOT mocked: the mode banner uses it to
 * notice when the real server comes online.
 */
import { http, HttpResponse, delay } from "msw";
import { apiUrl } from "../lib/api";
import {
  botInChat,
  chatRow,
  loadDb,
  messageWithEmail,
  nextId,
  publicUser,
  updateDb,
  type ChatStatus,
  type DemoPost,
} from "./db";
import { makeToken, userIdFromRequest } from "./auth";
import { deliverChatMessage } from "./realtime";

const ADMIN_EMAILS = ["demo.anna@volly.se"];
const CATEGORIES = [
  "Hälsa",
  "Teknik",
  "Vardag",
  "Studier",
  "Språk",
  "Karriär",
  "Administration",
  "Socialt",
  "Funktionsvariation",
  "Övrigt",
];

const unauthorized = () =>
  HttpResponse.json({ message: "No token provided" }, { status: 401 });
const notFound = (message: string) =>
  HttpResponse.json({ message }, { status: 404 });
const badRequest = (message: string) =>
  HttpResponse.json(
    { statusCode: 400, error: "Bad Request", message },
    { status: 400 }
  );

/** A little latency so loading states show, like a real network. */
const netDelay = () => delay(120 + Math.random() * 180);

type AuthBody = {
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
};

function authPayload(user: {
  id: number;
  email: string;
  onboarding_completed: boolean;
}) {
  return {
    id: user.id,
    token: makeToken(user.id),
    refreshToken: makeToken(user.id),
    onboarding_completed: user.onboarding_completed,
    is_admin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
  };
}

function postRows(authorEmail?: string | null) {
  const db = loadDb();
  return db.posts
    .map((p) => {
      const u = db.users.find((x) => x.id === p.user_id);
      return (
        u && {
          id: p.id,
          user_id: p.user_id,
          first_name: u.first_name,
          last_name: u.last_name,
          author_email: u.email,
          category: p.category,
          title: p.title,
          description: p.description,
          help_type: p.help_type,
          tagg: p.tagg,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }
      );
    })
    .filter(
      (p): p is NonNullable<typeof p> =>
        !!p && (!authorEmail || p.author_email === authorEmail)
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const httpHandlers = [
  // ---- auth -------------------------------------------------------------
  http.post(apiUrl("/api/auth/register"), async ({ request }) => {
    await netDelay();
    const body = (await request.json()) as AuthBody;
    const email = String(body.email ?? "").trim();
    if (!email || !body.password)
      return badRequest("email and password required");
    const result = updateDb((db) => {
      if (db.users.some((u) => u.email === email)) return null;
      const user = {
        id: nextId(db),
        email,
        password: body.password,
        first_name: body.first_name ?? null,
        last_name: body.last_name ?? null,
        bio: null,
        onboarding_completed: false,
      };
      db.users.push(user);
      return user;
    });
    if (!result)
      return HttpResponse.json({ message: "User exists" }, { status: 400 });
    return HttpResponse.json(
      { message: "User created", ...authPayload(result) },
      { status: 201 }
    );
  }),

  http.post(apiUrl("/api/auth/login"), async ({ request }) => {
    await netDelay();
    const { email, password } = (await request.json()) as AuthBody;
    const user = loadDb().users.find((u) => u.email === email);
    if (!user)
      return HttpResponse.json({ message: "User not found" }, { status: 401 });
    if (user.password !== password)
      return HttpResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    return HttpResponse.json(authPayload(user));
  }),

  // ---- users ------------------------------------------------------------
  http.patch(apiUrl("/api/users/me/onboarding"), ({ request }) => {
    const me = userIdFromRequest(request);
    if (!me) return unauthorized();
    updateDb((db) => {
      const u = db.users.find((x) => x.id === me);
      if (u) u.onboarding_completed = true;
    });
    return HttpResponse.json({ success: true });
  }),

  http.get(
    apiUrl("/api/users/by-email/:email"),
    async ({ request, params }) => {
      await netDelay();
      if (!userIdFromRequest(request)) return unauthorized();
      const user = loadDb().users.find((u) => u.email === String(params.email));
      return user
        ? HttpResponse.json(publicUser(user))
        : notFound("User not found");
    }
  ),

  http.put(
    apiUrl("/api/users/by-email/:email"),
    async ({ request, params }) => {
      await netDelay();
      if (!userIdFromRequest(request)) return unauthorized();
      const body = (await request.json()) as Partial<
        AuthBody & { bio: string }
      >;
      const updated = updateDb((db) => {
        const u = db.users.find((x) => x.email === String(params.email));
        if (!u) return null;
        u.email = body.email || u.email;
        u.first_name = body.first_name ?? u.first_name;
        u.last_name = body.last_name ?? u.last_name;
        u.bio = body.bio ?? u.bio;
        return publicUser(u);
      });
      return updated ? HttpResponse.json(updated) : notFound("User not found");
    }
  ),

  // ---- posts ------------------------------------------------------------
  http.get(apiUrl("/api/posts"), async ({ request }) => {
    await netDelay();
    const authorEmail = new URL(request.url).searchParams.get("author_email");
    return HttpResponse.json(postRows(authorEmail));
  }),

  http.post(apiUrl("/api/posts"), async ({ request }) => {
    await netDelay();
    const me = userIdFromRequest(request);
    if (!me) return unauthorized();
    const b = (await request.json()) as Partial<DemoPost>;
    if (!b.title || b.title.length < 3)
      return badRequest("body/title must NOT have fewer than 3 characters");
    if (!b.description || b.description.length < 3)
      return badRequest(
        "body/description must NOT have fewer than 3 characters"
      );
    if (!CATEGORIES.includes(String(b.category)))
      return badRequest(
        "body/category must be equal to one of the allowed values"
      );
    if (b.help_type !== "getHelp" && b.help_type !== "giveHelp")
      return badRequest(
        "body/help_type must be equal to one of the allowed values"
      );
    const created = updateDb((db) => {
      const now = new Date().toISOString();
      const p: DemoPost = {
        id: nextId(db),
        user_id: me,
        title: b.title!,
        description: b.description!,
        help_type: b.help_type!,
        category: b.category!,
        tagg: b.tagg ?? "",
        created_at: now,
        updated_at: now,
      };
      db.posts.push(p);
      return p;
    });
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete(apiUrl("/api/posts/:id"), ({ request, params }) => {
    const me = userIdFromRequest(request);
    if (!me) return unauthorized();
    const id = Number(params.id);
    const result = updateDb((db) => {
      const p = db.posts.find((x) => x.id === id);
      if (!p) return 404;
      const meUser = db.users.find((u) => u.id === me);
      const isAdmin = !!meUser && ADMIN_EMAILS.includes(meUser.email);
      if (!isAdmin && p.user_id !== me) return 403;
      const reqIds = db.requests
        .filter((r) => r.post_id === id)
        .map((r) => r.id);
      db.messages = db.messages.filter((m) => !reqIds.includes(m.request_id));
      db.requests = db.requests.filter((r) => r.post_id !== id);
      db.posts = db.posts.filter((x) => x.id !== id);
      return 200;
    });
    if (result === 404) return notFound("Post not found");
    if (result === 403)
      return HttpResponse.json(
        { message: "You can only delete your own posts" },
        { status: 403 }
      );
    return HttpResponse.json({ message: "Post deleted", id });
  }),

  // ---- chat -------------------------------------------------------------
  http.post(apiUrl("/api/chat/chat"), async ({ request }) => {
    await netDelay();
    const me = userIdFromRequest(request);
    const { postId } = (await request.json()) as { postId: number };
    if (!me || !postId) return badRequest("postId required");
    const result = updateDb((db) => {
      const p = db.posts.find((x) => x.id === Number(postId));
      if (!p) return { status: 404 as const };
      if (p.user_id === me) return { status: 400 as const };
      let r = db.requests.find(
        (x) => x.post_id === p.id && x.creator_id === me
      );
      if (!r) {
        r = {
          id: nextId(db),
          post_id: p.id,
          creator_id: me,
          status: "pending",
          created_at: new Date().toISOString(),
        };
        db.requests.push(r);
      }
      return {
        status: 200 as const,
        chat: chatRow(db, r),
        bot: botInChat(db, r.id, me),
      };
    });
    if (result.status === 404) return notFound("Post not found");
    if (result.status === 400)
      return badRequest("Cannot contact your own post");

    // A bot author accepts a few seconds later and says hello.
    const { chat, bot } = result;
    if (chat && bot && chat.status === "pending") {
      setTimeout(() => {
        updateDb((db) => {
          const r = db.requests.find((x) => x.id === chat.id);
          if (r) r.status = "accepted";
        });
        deliverChatMessage(
          String(chat.id),
          bot.id,
          `Hej! Jag har accepterat din förfrågan om "${chat.post_title}". Hur kan jag hjälpa dig?`
        );
      }, 3000);
    }
    return HttpResponse.json(chat);
  }),

  http.get(apiUrl("/api/chat/my"), async ({ request }) => {
    await netDelay();
    const me = userIdFromRequest(request);
    if (!me) return unauthorized();
    const db = loadDb();
    const mine = new Set(
      db.posts.filter((p) => p.user_id === me).map((p) => p.id)
    );
    return HttpResponse.json(
      db.requests
        .filter((r) => r.creator_id === me || mine.has(r.post_id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((r) => chatRow(db, r))
        .filter(Boolean)
    );
  }),

  http.patch(
    apiUrl("/api/chat/chat/:chatId/status"),
    async ({ request, params }) => {
      const me = userIdFromRequest(request);
      if (!me) return unauthorized();
      const { status } = (await request.json()) as { status: ChatStatus };
      if (!["pending", "accepted", "denied"].includes(status))
        return badRequest("Invalid status");
      const id = Number(params.chatId);
      const result = updateDb((db) => {
        const r = db.requests.find((x) => x.id === id);
        const chat = r && chatRow(db, r);
        if (!r || !chat) return { code: 404 as const };
        if (chat.post_author_id !== me) return { code: 403 as const };
        r.status = status;
        const creator = db.users.find((u) => u.id === r.creator_id);
        return {
          code: 200 as const,
          chat: chatRow(db, r),
          creatorBot: creator?.bot ? creator : null,
        };
      });
      if (result.code === 404) return notFound("Chat not found");
      if (result.code === 403)
        return HttpResponse.json(
          { message: "Only the recipient can decide" },
          { status: 403 }
        );
      if (status === "accepted" && result.creatorBot) {
        const bot = result.creatorBot;
        setTimeout(
          () =>
            deliverChatMessage(
              String(id),
              bot.id,
              "Tack för att du accepterade! 🙌 Har du tid för ett kort videosamtal?"
            ),
          1500
        );
      }
      return HttpResponse.json(result.chat);
    }
  ),

  http.get(apiUrl("/api/chat/chat/:roomId"), async ({ request, params }) => {
    await netDelay();
    const me = userIdFromRequest(request);
    if (!me) return unauthorized();
    const db = loadDb();
    const r = db.requests.find((x) => x.id === Number(params.roomId));
    const chat = r && chatRow(db, r);
    if (!chat) return notFound("Chat not found");
    if (me !== chat.creator_id && me !== chat.post_author_id)
      return HttpResponse.json(
        { message: "Not a participant" },
        { status: 403 }
      );
    return HttpResponse.json(
      db.messages
        .filter((m) => m.request_id === chat.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((m) => messageWithEmail(db, m))
    );
  }),

  // ---- video ------------------------------------------------------------
  // Tabs in one browser connect directly; a public STUN server is plenty.
  http.get(apiUrl("/api/turn-credentials"), () =>
    HttpResponse.json({
      urls: ["stun:stun.l.google.com:19302"],
      username: "",
      credential: "",
    })
  ),
];
