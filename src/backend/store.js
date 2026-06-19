import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { normalizeEmail } from "./security.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = process.env.ROOMWALK_DB_FILE || path.join(DATA_DIR, "roomwalk-db.json");
let postgresSql = null;
let initialized = false;

export async function initStore() {
  if (initialized) return;
  if (process.env.DATABASE_URL) {
    postgresSql = neon(process.env.DATABASE_URL);
    await postgresSql`
      create table if not exists users (
        id text primary key,
        name text not null,
        email text unique not null,
        password_hash text not null,
        created_at timestamptz not null default now()
      )
    `;
    await postgresSql`
      create table if not exists uploads (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        title text not null,
        listing_type text not null,
        files jsonb not null,
        created_at timestamptz not null default now()
      )
    `;
  } else {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(path.join(DATA_DIR, "uploads"), { recursive: true });
    try {
      await fs.access(DB_FILE);
    } catch {
      await writeJson({ users: [], uploads: [], leads: [] });
    }
  }
  initialized = true;
}

export async function findUserByEmail(email) {
  await initStore();
  const cleanEmail = normalizeEmail(email);
  if (postgresSql) {
    const rows = await postgresSql`select * from users where email = ${cleanEmail} limit 1`;
    return rows[0] ? mapUser(rows[0]) : null;
  }
  const db = await readJson();
  return db.users.find((user) => user.email === cleanEmail) || null;
}

export async function findUserById(id) {
  await initStore();
  if (!id) return null;
  if (postgresSql) {
    const rows = await postgresSql`select * from users where id = ${id} limit 1`;
    return rows[0] ? mapUser(rows[0]) : null;
  }
  const db = await readJson();
  return db.users.find((user) => user.id === id) || null;
}

export async function createUser({ name, email, passwordHash }) {
  await initStore();
  const user = {
    id: cryptoRandomId("usr"),
    name: String(name || "").trim(),
    email: normalizeEmail(email),
    passwordHash,
    createdAt: new Date().toISOString()
  };
  if (postgresSql) {
    await postgresSql`
      insert into users (id, name, email, password_hash, created_at)
      values (${user.id}, ${user.name}, ${user.email}, ${passwordHash}, ${user.createdAt})
    `;
    return user;
  }
  const db = await readJson();
  db.users.push(user);
  await writeJson(db);
  return user;
}

export async function createUpload({ userId, title, listingType, files }) {
  await initStore();
  const upload = {
    id: cryptoRandomId("upl"),
    userId,
    title: String(title || "Novi oglas").trim().slice(0, 120),
    listingType: String(listingType || "stan").trim().slice(0, 32),
    files,
    createdAt: new Date().toISOString()
  };
  if (postgresSql) {
    await postgresSql`
      insert into uploads (id, user_id, title, listing_type, files, created_at)
      values (${upload.id}, ${userId}, ${upload.title}, ${upload.listingType}, ${JSON.stringify(files)}, ${upload.createdAt})
    `;
    return upload;
  }
  const db = await readJson();
  db.uploads.push(upload);
  await writeJson(db);
  return upload;
}

export async function listUploads(userId) {
  await initStore();
  if (postgresSql) {
    const rows = await postgresSql`
      select id, user_id, title, listing_type, files, created_at
      from uploads
      where user_id = ${userId}
      order by created_at desc
      limit 30
    `;
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      listingType: row.listing_type,
      files: row.files,
      createdAt: row.created_at
    }));
  }
  const db = await readJson();
  return db.uploads.filter((upload) => upload.userId === userId).slice(-30).reverse();
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

async function readJson() {
  await initStore();
  return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
}

async function writeJson(value) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(value, null, 2));
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

function cryptoRandomId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}
