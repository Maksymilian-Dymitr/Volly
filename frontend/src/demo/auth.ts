/**
 * Demo tokens look like JWTs (header.payload.signature) because the app
 * reads the user id out of the payload, but they are not signed.
 */
const b64url = (s: string) =>
  btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function makeToken(userId: number): string {
  const header = b64url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ id: userId, demo: true }));
  return `${header}.${payload}.demo`;
}

export function userIdFromToken(token: string | null | undefined): number {
  try {
    if (!token) return 0;
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return Number(JSON.parse(atob(b64)).id) || 0;
  } catch {
    return 0;
  }
}

export function userIdFromRequest(request: Request): number {
  const header = request.headers.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? userIdFromToken(header.slice(7)) : 0;
}
