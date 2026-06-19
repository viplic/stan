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
        name text not null default '',
        email text unique not null,
        phone text not null default '',
        password_hash text not null,
        email_verified boolean not null default false,
        verification_token text,
        created_at timestamptz not null default now()
      )
    `;
    await postgresSql`alter table users add column if not exists phone text not null default ''`;
    await postgresSql`alter table users add column if not exists email_verified boolean not null default false`;
    await postgresSql`alter table users add column if not exists verification_token text`;
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
    await postgresSql`
      create table if not exists analytics_visits (
        visitor_id text primary key,
        visit_day text not null,
        last_seen timestamptz not null default now()
      )
    `;
  } else {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(path.join(DATA_DIR, "uploads"), { recursive: true });
    try {
      await fs.access(DB_FILE);
    } catch {
      await writeJson({ users: [], uploads: [], leads: [], visits: [] });
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

export async function createUser({ email, phone, passwordHash, verificationToken }) {
  await initStore();
  const user = {
    id: cryptoRandomId("usr"),
    name: "",
    email: normalizeEmail(email),
    phone: String(phone || "").trim(),
    passwordHash,
    emailVerified: false,
    verificationToken,
    createdAt: new Date().toISOString()
  };
  if (postgresSql) {
    await postgresSql`
      insert into users (id, name, email, password_hash, created_at)
      values (${user.id}, ${user.name}, ${user.email}, ${passwordHash}, ${user.createdAt})
    `;
    await postgresSql`
      update users set phone = ${user.phone}, email_verified = false, verification_token = ${verificationToken}
      where id = ${user.id}
    `;
    return user;
  }
  const db = await readJson();
  db.users.push(user);
  await writeJson(db);
  return user;
}

export async function createUpload({ userId, title, listingType, metadata, files }) {
  await initStore();
  const upload = {
    id: cryptoRandomId("upl"),
    userId,
    title: String(title || "Novi oglas").trim().slice(0, 120),
    listingType: String(listingType || "stan").trim().slice(0, 32),
    metadata: metadata || {},
    files,
    createdAt: new Date().toISOString()
  };
  if (postgresSql) {
    await postgresSql`
      insert into uploads (id, user_id, title, listing_type, files, created_at)
      values (${upload.id}, ${userId}, ${upload.title}, ${upload.listingType}, ${JSON.stringify({ files, metadata: upload.metadata })}, ${upload.createdAt})
    `;
    return upload;
  }
  const db = await readJson();
  db.uploads.push(upload);
  await writeJson(db);
  return upload;
}

export async function verifyUserEmail(token) {
  await initStore();
  if (!token) return null;
  if (postgresSql) {
    const rows = await postgresSql`
      update users
      set email_verified = true, verification_token = null
      where verification_token = ${token}
      returning *
    `;
    return rows[0] ? mapUser(rows[0]) : null;
  }
  const db = await readJson();
  const user = db.users.find((item) => item.verificationToken === token);
  if (!user) return null;
  user.emailVerified = true;
  user.verificationToken = null;
  await writeJson(db);
  return user;
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
      metadata: row.files?.metadata || {},
      createdAt: row.created_at
    }));
  }
  const db = await readJson();
  return db.uploads.filter((upload) => upload.userId === userId).slice(-30).reverse();
}

export async function recordVisit(visitorId) {
  await initStore();
  const cleanId = String(visitorId || "").slice(0, 80);
  const visitDay = new Date().toISOString().slice(0, 10);
  if (postgresSql) {
    await postgresSql`
      insert into analytics_visits (visitor_id, visit_day, last_seen)
      values (${cleanId}, ${visitDay}, now())
      on conflict (visitor_id)
      do update set visit_day = ${visitDay}, last_seen = now()
    `;
    return;
  }
  const db = await readJson();
  db.visits ||= [];
  const existing = db.visits.find((visit) => visit.visitorId === cleanId);
  if (existing) {
    existing.visitDay = visitDay;
    existing.lastSeen = new Date().toISOString();
  } else {
    db.visits.push({ visitorId: cleanId, visitDay, lastSeen: new Date().toISOString() });
  }
  await writeJson(db);
}

export async function getAnalyticsStats() {
  await initStore();
  const visitDay = new Date().toISOString().slice(0, 10);
  const liveCutoff = new Date(Date.now() - 1000 * 60 * 5).toISOString();
  if (postgresSql) {
    const today = await postgresSql`select count(*)::int as count from analytics_visits where visit_day = ${visitDay}`;
    const live = await postgresSql`select count(*)::int as count from analytics_visits where last_seen > ${liveCutoff}`;
    return {
      visitorsToday: today[0]?.count || 0,
      liveVisitors: live[0]?.count || 0
    };
  }
  const db = await readJson();
  db.visits ||= [];
  return {
    visitorsToday: db.visits.filter((visit) => visit.visitDay === visitDay).length,
    liveVisitors: db.visits.filter((visit) => visit.lastSeen > liveCutoff).length
  };
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    phone: user.phone,
    emailVerified: Boolean(user.emailVerified)
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
    phone: row.phone,
    passwordHash: row.password_hash,
    emailVerified: row.email_verified,
    verificationToken: row.verification_token,
    createdAt: row.created_at
  };
}

function cryptoRandomId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}
