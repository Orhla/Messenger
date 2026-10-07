alter table public.room_messages replica identity full;

alter publication supabase_realtime add table public.room_messages;