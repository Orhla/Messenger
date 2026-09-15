create table messages (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  author text not null,
  created_at timestamptz default now()
);

alter publication supabase_realtime add table messages;
