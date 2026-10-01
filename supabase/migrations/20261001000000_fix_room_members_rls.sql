create or replace function public.is_room_member(_room_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from room_members
    where room_id = _room_id and member_id = _user_id
  );
$$;

grant execute on function public.is_room_member(uuid, uuid) to authenticated;

drop policy "room_members: only members can view" on public.room_members;
create policy "room_members: only members can view"
on public.room_members for select
to authenticated
using (public.is_room_member(room_id, auth.uid()));

drop policy "room_members: only members can add" on public.room_members;
create policy "room_members: only creator can add"
on public.room_members for insert
to authenticated
with check (
  exists (
    select 1 from public.rooms
    where rooms.id = room_members.room_id
      and rooms.creator = auth.uid()
  )
);
