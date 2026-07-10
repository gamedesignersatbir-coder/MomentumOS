/**
 * Single-user passcode auth. The session cookie carries an HMAC of a fixed
 * token version, keyed by AUTH_SECRET — Web Crypto only, so the same code
 * runs in Edge middleware and Node server actions.
 */

export const SESSION_COOKIE = 'aaj_session';
const TOKEN_VERSION = 'aaj-session-v1';

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sessionToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured.');
  return hmac(secret, TOKEN_VERSION);
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const expected = await hmac(secret, TOKEN_VERSION);
  if (cookieValue.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= cookieValue.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function isCorrectPasscode(input: string): boolean {
  const passcode = process.env.APP_PASSCODE ?? '';
  if (!passcode) return false;
  const a = new TextEncoder().encode(input);
  const b = new TextEncoder().encode(passcode);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
