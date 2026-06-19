create table if not exists users (
  id text primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists uploads (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  listing_type text not null,
  files jsonb not null,
  created_at timestamptz not null default now()
);
