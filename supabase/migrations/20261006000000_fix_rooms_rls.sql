DROP POLICY IF EXISTS "rooms: only members can read" ON public.rooms;
CREATE POLICY "rooms: only members can read"
ON public.rooms FOR SELECT
TO authenticated
USING (
  creator = auth.uid()
  OR 
  public.is_room_member(id, auth.uid())
);

DROP POLICY IF EXISTS "rooms_messages: only members can read" ON public.room_messages;
CREATE POLICY "rooms_messages: only members can read"
ON public.room_messages FOR SELECT
TO authenticated
USING (
  public.is_room_member(room_id, auth.uid())
);

DROP POLICY IF EXISTS "room_messages: only members can write" ON public.room_messages;
CREATE POLICY "room_messages: only members can write"
ON public.room_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND
  public.is_room_member(room_id, auth.uid())
);