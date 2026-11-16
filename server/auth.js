// Signing in, shared by customers, vendors and the admin: password hashing, signed tokens,
// a brake on password guessing, and Cloudflare Turnstile's "is this a person" check.
import crypto from "node:crypto";

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "celebrate-demo-secret";

// Passwords are stored as salted scrypt hashes, never as typed.
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString("hex")}`;
}

export function checkPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const tried = crypto.scryptSync(String(password), salt, 32);
  return tried.length === hash.length / 2 && crypto.timingSafeEqual(tried, Buffer.from(hash, "hex"));
}

/** Compares two secrets without leaking, through timing, how much of them matched. */
export const same = (a, b) => {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

const sign = (body) => crypto.createHmac("sha256", SECRET).update(body).digest("base64url");

/** A signed, expiring token carrying `claims` (who is signed in, and as what). */
export function makeToken(claims, hours = 12) {
  const body = Buffer.from(JSON.stringify({ ...claims, exp: Date.now() + hours * 3600000 })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken(token) {
  const [body, mark] = String(token ?? "").split(".");
  if (!body || !mark || !same(mark, sign(body))) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString());
    return claims.exp > Date.now() ? claims : null;
  } catch {
    return null;
  }
}

/** The claims in a request's "Authorization: Bearer …" header, or null. */
export const claimsOf = (req) => readToken(String(req.headers.authorization ?? "").replace(/^Bearer /, ""));

// Slows down password guessing. Counts are per server process, so this is a first line of defence only.
const attempts = new Map();
export function tooManyAttempts(key) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((at) => now - at < 10 * 60000);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > 10;
}

// Cloudflare Turnstile checks that a sign-in comes from a person. Until real keys are set
// (TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY), Cloudflare's public test keys are used: they always pass.
export const TURNSTILE = {
  siteKey: process.env.TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
  secret: process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA",
  test: !(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY),
};

/** Asks Cloudflare whether a Turnstile token is good. Returns {} or { error, status }. */
export async function verifyHuman(token) {
  if (!token) return { error: "Complete the security check first.", status: 400 };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: TURNSTILE.secret, response: String(token) }),
    });
    const verdict = await response.json();
    return verdict?.success ? {} : { error: "The security check did not pass. Please try again.", status: 403 };
  } catch {
    return { error: "We could not reach the security check. Try again in a moment.", status: 503 };
  }
}
