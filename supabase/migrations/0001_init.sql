-- AAJ initial schema. Single user; access is server-side only via the
-- service-role key, behind passcode middleware. No RLS needed.

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  display_name text not null default 'Satbir',
  timezone text not null default 'Asia/Kolkata',
  first_used_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists tasks (
  id bigint generated always as identity primary key,
  title text not null,
  url text,
  status text not null default 'active' check (status in ('active','done','dropped')),
  day date not null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists tasks_day_idx on tasks (day, status);

create table if not exists reflections (
  id bigint generated always as identity primary key,
  day date not null unique,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists curricula (
  id bigint generated always as identity primary key,
  title text not null,
  goal text not null,
  modules jsonb not null,
  created_at timestamptz not null default now(),
  archived boolean not null default false
);

create table if not exists sessions (
  id bigint generated always as identity primary key,
  curriculum_id bigint not null references curricula(id) on delete cascade,
  module_index int not null,
  messages jsonb not null default '[]'::jsonb,
  fuzzy text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sessions_curriculum_idx on sessions (curriculum_id, module_index);

create table if not exists reviews (
  curriculum_id bigint not null references curricula(id) on delete cascade,
  module_index int not null,
  stage int not null default 0,
  due date not null,
  dismissed boolean not null default false,
  primary key (curriculum_id, module_index)
);

create table if not exists briefings (
  window_key text primary key,
  items jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists saved_items (
  id bigint generated always as identity primary key,
  title text not null,
  url text not null unique,
  source text,
  saved_at timestamptz not null default now()
);

create table if not exists sources (
  id bigint generated always as identity primary key,
  name text not null,
  url text not null unique,
  enabled boolean not null default true
);

create table if not exists letters (
  month text primary key,
  text text not null,
  created_at timestamptz not null default now()
);

-- Default sources: small, named, editable in Settings. Chosen for a game
-- designer who follows AI — quality over volume.
insert into sources (name, url) values
  ('Game Developer',      'https://www.gamedeveloper.com/rss.xml'),
  ('Eurogamer',           'https://www.eurogamer.net/feed'),
  ('Rock Paper Shotgun',  'https://www.rockpapershotgun.com/feed'),
  ('Simon Willison',      'https://simonwillison.net/atom/everything/'),
  ('The Decoder',         'https://the-decoder.com/feed/'),
  ('Hacker News (150+)',  'https://hnrss.org/frontpage?points=150')
on conflict (url) do nothing;
