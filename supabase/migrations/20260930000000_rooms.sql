create table rooms (
  id uuid primary key default gen_random_uuid(),
  room_name text not null,
  creator uuid not null,
  created_at timestamptz default now()
);

create table room_members (
  room_id uuid not null references rooms(id) on delete cascade,
  member_id uuid not null,

  primary key (room_id, member_id)
);

create table room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  sender_id uuid not null,
  created_at timestamptz default now(),
  text text not null
);


alter table public.rooms enable row level security;

create policy "rooms: authenticated can create"
on public.rooms for insert
to authenticated
with check (creator = auth.uid());

create policy "rooms: only members can read"
on public.rooms for select
to authenticated
using (
  creator = auth.uid()
  or
  exists (
    select 1 from public.room_members
    where room_members.room_id = rooms.id
      and room_members.member_id = auth.uid()
  )
);


alter table public.room_members enable row level security;

create policy "room_members: only members can view"
on public.room_members for select
to authenticated
using (
  exists (
    select 1 from public.room_members as members
    where members.room_id = room_members.room_id
      and members.member_id = auth.uid()
  )
);

create policy "room_members: only members can add"
on public.room_members for insert
to authenticated
with check (
  exists (
    select 1 from public.room_members as existing_members
    where existing_members.room_id = room_members.room_id
      and existing_members.member_id = auth.uid()
  )
);


alter table public.room_messages enable row level security;

create policy "rooms_messages: only members can read"
on public.room_messages for select
to authenticated
using (
  exists (
    select 1 from public.room_members
    where room_members.room_id = room_messages.room_id
      and room_members.member_id = auth.uid()
  )
);

create policy "room_messages: only members can write"
on public.room_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and
  exists (
    select 1 from public.room_members
    where room_members.room_id = room_messages.room_id
      and room_members.member_id = auth.uid()
  )
);
