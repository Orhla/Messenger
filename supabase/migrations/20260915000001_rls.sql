alter table profiles enable row level security;

create policy "profiles: authenticated can read"
  on profiles for select
  to authenticated
  using (true);

alter table messages enable row level security;

create policy "messages: read own"
  on messages for select
  using (
    sender_id = auth.uid() or receiver_id = auth.uid()
  );

create policy "messages: insert as self"
  on messages for insert
  with check (sender_id = auth.uid());