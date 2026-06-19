import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import formidable from "formidable";
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  readSessionToken,
  securityHeaders,
  sessionCookie,
  validateSignup,
  verifyPassword,
  verifySessionToken
} from "./security.js";
import {
  createUpload,
  createUser,
  findUserByEmail,
  findUserById,
  initStore,
  listUploads,
  publicUser,
  verifyUserEmail
} from "./store.js";

const MAX_UPLOAD_SIZE = 1024 * 1024 * 120;
const MAX_UPLOAD_FILES = 30;
const UPLOAD_DIR = path.resolve(process.cwd(), "data", "uploads");

export function createApiApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use((request, response, next) => {
    response.set(securityHeaders());
    next();
  });

  app.get("/api/health", async (_request, response) => {
    await initStore();
    response.json({ ok: true });
  });

  app.get("/api/auth/verify", async (request, response) => {
    const user = await verifyUserEmail(String(request.query.token || ""));
    if (!user) return response.status(400).send("Verifikacioni link nije ispravan ili je istekao.");
    const token = createSessionToken(user.id);
    response.setHeader("Set-Cookie", sessionCookie(token, request));
    response.redirect("/#upload");
  });

  app.get("/api/auth/me", async (request, response) => {
    const user = await requireUser(request);
    response.json({ user: publicUser(user) });
  });

  app.post("/api/auth/signup", async (request, response) => {
    const error = validateSignup(request.body || {});
    if (error) return response.status(400).json({ error: "invalid_signup", message: error });

    const existing = await findUserByEmail(request.body.email);
    if (existing) return response.status(409).json({ error: "email_exists", message: "Nalog sa ovim emailom već postoji." });

    const user = await createUser({
      email: request.body.email,
      phone: request.body.phone,
      verificationToken: crypto.randomBytes(24).toString("hex"),
      passwordHash: await hashPassword(request.body.password)
    });
    await sendVerificationEmail(request, user);
    response.status(201).json({
      verificationRequired: true,
      message: "Poslali smo verifikacioni email. Potvrdite email pre korišćenja aplikacije."
    });
  });

  app.post("/api/auth/login", async (request, response) => {
    const user = await findUserByEmail(request.body?.email);
    if (!user || !(await verifyPassword(request.body?.password, user.passwordHash))) {
      return response.status(401).json({ error: "invalid_login", message: "Email ili lozinka nisu ispravni." });
    }
    if (!user.emailVerified) {
      return response.status(403).json({ error: "email_not_verified", message: "Potvrdite email pre korišćenja aplikacije." });
    }
    const token = createSessionToken(user.id);
    response.setHeader("Set-Cookie", sessionCookie(token, request));
    response.json({ user: publicUser(user) });
  });

  app.post("/api/auth/logout", (request, response) => {
    response.setHeader("Set-Cookie", clearSessionCookie(request));
    response.json({ ok: true });
  });

  app.get("/api/uploads", async (request, response) => {
    const user = await requireUser(request, response);
    if (!user) return;
    response.json({ uploads: await listUploads(user.id) });
  });

  app.post("/api/uploads", async (request, response) => {
    const user = await requireUser(request, response);
    if (!user) return;
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      multiples: true,
      maxTotalFileSize: MAX_UPLOAD_SIZE,
      maxFiles: MAX_UPLOAD_FILES,
      filter: ({ mimetype }) => Boolean(mimetype?.startsWith("image/") || mimetype?.startsWith("video/"))
    });

    form.parse(request, async (error, fields, files) => {
      if (error) {
        response.status(400).json({ error: "upload_failed", message: "Upload nije uspeo. Proverite format i veličinu fajlova." });
        return;
      }
      const incomingFiles = Object.values(files).flat().filter(Boolean);
      if (!incomingFiles.length) {
        response.status(400).json({ error: "missing_files", message: "Dodajte bar jednu sliku ili video." });
        return;
      }
      const upload = await createUpload({
        userId: user.id,
        title: firstField(fields.title) || "Novi oglas",
        listingType: firstField(fields.listingType) || "stan",
        metadata: {
          purpose: firstField(fields.purpose) || "",
          price: firstField(fields.price) || "",
          size: firstField(fields.size) || "",
          location: firstField(fields.location) || "",
          newBuild: firstField(fields.newBuild) === "true",
          furnished: firstField(fields.furnished) === "true"
        },
        files: incomingFiles.map((file) => ({
          name: file.originalFilename,
          type: file.mimetype,
          size: file.size
        }))
      });
      response.status(201).json({ upload });
    });
  });

  return app;
}

async function requireUser(request, response = null) {
  const payload = verifySessionToken(readSessionToken(request));
  const user = payload ? await findUserById(payload.userId) : null;
  if (user && !user.emailVerified) {
    if (response) response.status(403).json({ error: "email_not_verified", message: "Potvrdite email pre korišćenja aplikacije." });
    return null;
  }
  if (!user && response) {
    response.status(401).json({ error: "auth_required", message: "Prijavite se da nastavite." });
  }
  return user;
}

function firstField(value) {
  return Array.isArray(value) ? value[0] : value;
}

async function sendVerificationEmail(request, user) {
  const origin = `${request.headers["x-forwarded-proto"] || request.protocol || "http"}://${request.headers.host}`;
  const link = `${origin}/api/auth/verify?token=${encodeURIComponent(user.verificationToken)}`;
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Verifikacija RoomWalk naloga",
        html: `<p>Potvrdite email da biste koristili RoomWalk.</p><p><a href="${link}">Verifikuj email</a></p>`
      })
    });
    return;
  }
  console.log(`RoomWalk verification link for ${user.email}: ${link}`);
}
