/**
 * In-browser stand-in for Postgres, used only in demo mode.
 * Stored in localStorage so every tab of this browser shares one "server".
 */

export type DemoUser = {
  id: number;
  email: string;
  password: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  onboarding_completed: boolean;
  /** Bots answer chats and video calls automatically. */
  bot?: boolean;
};

export type DemoPost = {
  id: number;
  user_id: number;
  title: string;
  description: string;
  help_type: "getHelp" | "giveHelp";
  category: string;
  tagg: string;
  created_at: string;
  updated_at: string;
};

export type ChatStatus = "pending" | "accepted" | "denied";

export type DemoRequest = {
  id: number;
  post_id: number;
  creator_id: number;
  status: ChatStatus;
  created_at: string;
};

export type DemoMessage = {
  id: number;
  request_id: number;
  sender_id: number;
  text_message: string;
  created_at: string;
};

export type DemoDb = {
  users: DemoUser[];
  posts: DemoPost[];
  requests: DemoRequest[];
  messages: DemoMessage[];
  nextId: number;
};

export const DEMO_PASSWORD = "VollyDemo2026";
const KEY = "volly-demo-db";
const VERSION_KEY = "volly-demo-db-version";
const VERSION = "1";

const ago = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

function seed(): DemoDb {
  const user = (
    id: number,
    email: string,
    first: string,
    last: string,
    bio: string,
    bot = false
  ): DemoUser => ({
    id,
    email,
    password: DEMO_PASSWORD,
    first_name: first,
    last_name: last,
    bio,
    onboarding_completed: true,
    bot,
  });
  const post = (
    id: number,
    user_id: number,
    title: string,
    description: string,
    help_type: DemoPost["help_type"],
    category: string,
    tagg: string,
    minutesAgo: number
  ): DemoPost => ({
    id,
    user_id,
    title,
    description,
    help_type,
    category,
    tagg,
    created_at: ago(minutesAgo),
    updated_at: ago(minutesAgo),
  });

  return {
    users: [
      user(
        1,
        "demo.anna@volly.se",
        "Anna",
        "Lind",
        "Utvecklare som gärna hjälper till med teknik och CV."
      ),
      user(
        2,
        "demo.erik@volly.se",
        "Erik",
        "Berg",
        "Pluggar svenska och lär mig programmera."
      ),
      user(
        3,
        "demo.sara@volly.se",
        "Sara",
        "Holm",
        "Pensionerad lärare, hjälper gärna med språk.",
        true
      ),
      user(
        4,
        "demo.omar@volly.se",
        "Omar",
        "Nasser",
        "Ekonom, kan hjälpa med blanketter och budget.",
        true
      ),
    ],
    posts: [
      post(
        1,
        1,
        "Hjälp med CV och LinkedIn",
        "Jag kan gå igenom ditt CV och ge tips inför intervjuer inom IT.",
        "giveHelp",
        "Karriär",
        "cv,intervju",
        2 * 24 * 60
      ),
      post(
        2,
        2,
        "Någon som kan förklara React hooks?",
        "Jag fastnar på useEffect och vill gärna ha en genomgång över videosamtal.",
        "getHelp",
        "Teknik",
        "react",
        24 * 60
      ),
      post(
        3,
        3,
        "Språkcafé på distans",
        "Öva svenska i lugnt tempo, alla nivåer välkomna.",
        "giveHelp",
        "Språk",
        "svenska",
        5 * 60
      ),
      post(
        4,
        4,
        "Hjälp med Försäkringskassans blanketter",
        "Jag har jobbat med detta i tio år, fråga på!",
        "giveHelp",
        "Administration",
        "blanketter",
        3 * 60
      ),
      post(
        5,
        2,
        "Söker studiekompis i matte",
        "Läser Matte 3c på distans och vill plugga ihop.",
        "getHelp",
        "Studier",
        "matte",
        2 * 60
      ),
      post(
        6,
        3,
        "Promenadsällskap i Göteborg",
        "Gillar långa promenader och fika, vem hänger med?",
        "giveHelp",
        "Socialt",
        "",
        90
      ),
    ],
    requests: [
      // Anna <-> Erik: two humans, open a second tab to play both sides.
      {
        id: 1,
        post_id: 2,
        creator_id: 1,
        status: "accepted",
        created_at: ago(20 * 60),
      },
      // Anna <-> Sara (bot): replies and answers video calls on her own.
      {
        id: 2,
        post_id: 3,
        creator_id: 1,
        status: "accepted",
        created_at: ago(60),
      },
      // Omar (bot) wants Anna's help: accept it to see the request flow.
      {
        id: 3,
        post_id: 1,
        creator_id: 4,
        status: "pending",
        created_at: ago(30),
      },
      // Erik <-> Sara (bot)
      {
        id: 4,
        post_id: 3,
        creator_id: 2,
        status: "accepted",
        created_at: ago(45),
      },
    ],
    messages: [
      {
        id: 1,
        request_id: 1,
        sender_id: 1,
        text_message: "Hej Erik! Jag kan hjälpa dig med hooks.",
        created_at: ago(19 * 60),
      },
      {
        id: 2,
        request_id: 1,
        sender_id: 2,
        text_message: "Toppen! Kan vi ta ett videosamtal?",
        created_at: ago(18 * 60),
      },
      {
        id: 3,
        request_id: 2,
        sender_id: 3,
        text_message: "Hej Anna! Välkommen till språkcaféet 😊",
        created_at: ago(55),
      },
      {
        id: 4,
        request_id: 2,
        sender_id: 1,
        text_message: "Tack! När passar det att ses?",
        created_at: ago(50),
      },
      {
        id: 5,
        request_id: 2,
        sender_id: 3,
        text_message:
          "Skriv här eller ring mig med videoknappen, jag svarar direkt.",
        created_at: ago(49),
      },
      {
        id: 6,
        request_id: 4,
        sender_id: 3,
        text_message: "Hej Erik! Vad vill du öva på idag?",
        created_at: ago(40),
      },
    ],
    nextId: 100,
  };
}

export function loadDb(): DemoDb {
  try {
    if (localStorage.getItem(VERSION_KEY) === VERSION) {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as DemoDb;
    }
  } catch {
    // fall through to a fresh seed
  }
  const db = seed();
  saveDb(db);
  return db;
}

export function saveDb(db: DemoDb) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    localStorage.setItem(VERSION_KEY, VERSION);
  } catch {
    // storage blocked: the demo still works for this page load
  }
}

/** Read-modify-write, always on the latest copy (other tabs write too). */
export function updateDb<T>(fn: (db: DemoDb) => T): T {
  const db = loadDb();
  const result = fn(db);
  saveDb(db);
  return result;
}

export function resetDb() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(VERSION_KEY);
}

export function nextId(db: DemoDb) {
  return db.nextId++;
}

export function publicUser(u: DemoUser) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    bio: u.bio,
  };
}

/** Same shape as the backend's getChatById (chat.repo.ts). */
export function chatRow(db: DemoDb, r: DemoRequest) {
  const post = db.posts.find((p) => p.id === r.post_id);
  const creator = db.users.find((u) => u.id === r.creator_id);
  const author = db.users.find((u) => u.id === post?.user_id);
  if (!post || !creator || !author) return null;
  return {
    id: r.id,
    post_id: r.post_id,
    creator_id: r.creator_id,
    status: r.status,
    created_at: r.created_at,
    post_title: post.title,
    post_author_id: post.user_id,
    creator_first_name: creator.first_name,
    creator_last_name: creator.last_name,
    creator_email: creator.email,
    author_first_name: author.first_name,
    author_last_name: author.last_name,
    author_email: author.email,
  };
}

/** The bot on the other side of a chat, if any. */
export function botInChat(db: DemoDb, requestId: number, viewerId: number) {
  const r = db.requests.find((x) => x.id === requestId);
  const post = r && db.posts.find((p) => p.id === r.post_id);
  if (!r || !post) return null;
  const otherId = r.creator_id === viewerId ? post.user_id : r.creator_id;
  const other = db.users.find((u) => u.id === otherId);
  return other?.bot ? other : null;
}

export function messageWithEmail(db: DemoDb, m: DemoMessage) {
  return {
    ...m,
    sender_email: db.users.find((u) => u.id === m.sender_id)?.email ?? null,
  };
}
