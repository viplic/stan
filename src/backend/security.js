import crypto from "node:crypto";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validateSignup({ email, password, phone }) {
  const cleanEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return "Unesite ispravan email.";
  if (String(phone || "").replace(/[^\d+]/g, "").length < 8) return "Unesite ispravan broj telefona.";
  if (String(password || "").length < MIN_PASSWORD_LENGTH) return "Lozinka mora imati minimum 8 karaktera.";
  return null;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt);
  return `${salt}:${hash}`;
}

export async function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const nextHash = await scrypt(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(nextHash, "hex"));
}

export function createSessionToken(userId) {
  const payload = {
    userId,
    exp: Date.now() + SESSION_TTL_MS,
    nonce: crypto.randomBytes(12).toString("hex")
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function readSessionToken(request) {
  const cookieHeader = request.headers.cookie || "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith("rw_session="));
  return cookie ? decodeURIComponent(cookie.slice("rw_session=".length)) : "";
}

export function verifySessionToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature || sign(body) !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.userId || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(token, request) {
  const secure = isSecureRequest(request) ? "; Secure" : "";
  return `rw_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

export function clearSessionCookie(request) {
  const secure = isSecureRequest(request) ? "; Secure" : "";
  return `rw_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

export function securityHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...extra
  };
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function sessionSecret() {
  return process.env.SESSION_SECRET || "roomwalk-local-dev-secret-change-before-production";
}

function isSecureRequest(request) {
  return request.headers["x-forwarded-proto"] === "https" || request.socket?.encrypted;
}

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey.toString("hex"));
    });
  });
}
