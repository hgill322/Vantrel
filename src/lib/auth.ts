// Uses Web Crypto (globalThis.crypto.subtle) instead of Node's `crypto`
// module because this file is imported by middleware.ts, which runs in the
// Edge runtime and doesn't support Node's crypto APIs. Same reasoning rules
// out Buffer/base64 helpers below in favor of hex + TextEncoder/TextDecoder.

const COOKIE_NAME = "vantrel_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export type Role = "staff" | "landlord" | "tenant";

export interface SessionPayload {
  sub: string; // User.id
  role: Role;
  landlordId: string | null;
  unitId: string | null;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set. Copy .env.example to .env and fill it in.");
  return s;
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buf: ArrayBuffer | Uint8Array) {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function sign(payloadHex: string) {
  const key = await hmacKey();
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadHex));
  return toHex(sigBuf);
}

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createSessionToken(data: { sub: string; role: Role; landlordId: string | null; unitId: string | null }) {
  const payloadJson = JSON.stringify({ ...data, iat: Date.now() });
  const payloadHex = toHex(new TextEncoder().encode(payloadJson));
  const sig = await sign(payloadHex);
  return `${payloadHex}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [payloadHex, sig] = token.split(".");
  if (!payloadHex || !sig) return null;

  const expected = await sign(payloadHex);
  if (!timingSafeEqualStr(sig, expected)) return null;

  let parsed: { sub: string; role: Role; landlordId: string | null; unitId: string | null; iat: number };
  try {
    parsed = JSON.parse(new TextDecoder().decode(fromHex(payloadHex)));
  } catch {
    return null;
  }

  const age = (Date.now() - Number(parsed.iat)) / 1000;
  if (!(age >= 0 && age < MAX_AGE_SECONDS)) return null;

  return { sub: parsed.sub, role: parsed.role, landlordId: parsed.landlordId ?? null, unitId: parsed.unitId ?? null };
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
