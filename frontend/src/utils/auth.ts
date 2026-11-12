/**
 * Per-tab login (sessionStorage) so two tabs can be signed in as two
 * different users, e.g. to chat or video-call yourself in a demo.
 */
export const authStorage: Storage = sessionStorage;

const TOKEN_KEY = "token";
const EXPIRY_KEY = "tokenExpiry";
const USER_KEY = "currentUser";

const ONE_HOUR_MS = 60 * 60 * 1000;

export function saveToken(token: string) {
  authStorage.setItem(TOKEN_KEY, token);
  authStorage.setItem(EXPIRY_KEY, String(Date.now() + ONE_HOUR_MS));
}

export function getToken(): string | null {
  const expiry = authStorage.getItem(EXPIRY_KEY);
  if (expiry && Date.now() > Number(expiry)) return null;
  return authStorage.getItem(TOKEN_KEY);
}

export function tokenExpiry(): boolean {
  const expiry = authStorage.getItem(EXPIRY_KEY);
  if (!expiry) return false;
  return Date.now() > Number(expiry);
}

export function clearAuth() {
  authStorage.removeItem(TOKEN_KEY);
  authStorage.removeItem(EXPIRY_KEY);
  authStorage.removeItem(USER_KEY);
  authStorage.removeItem("userId");
  authStorage.removeItem("isAdmin");
}
