import { promises as fs } from "node:fs";
import path from "node:path";
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
  publicUser
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
      name: request.body.name,
      email: request.body.email,
      passwordHash: await hashPassword(request.body.password)
    });
    const token = createSessionToken(user.id);
    response.setHeader("Set-Cookie", sessionCookie(token, request));
    response.status(201).json({ user: publicUser(user) });
  });

  app.post("/api/auth/login", async (request, response) => {
    const user = await findUserByEmail(request.body?.email);
    if (!user || !(await verifyPassword(request.body?.password, user.passwordHash))) {
      return response.status(401).json({ error: "invalid_login", message: "Email ili lozinka nisu ispravni." });
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
  if (!user && response) {
    response.status(401).json({ error: "auth_required", message: "Prijavite se da nastavite." });
  }
  return user;
}

function firstField(value) {
  return Array.isArray(value) ? value[0] : value;
}
