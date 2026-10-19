DROP POLICY IF EXISTS "room_keys: users can insert wrapped keys if they are room members and authors" ON public.room_keys;
DROP POLICY IF EXISTS "room_keys: users can update wrapped keys if they are room members and authors" ON public.room_keys;

CREATE INDEX IF NOT EXISTS idx_room_members_room_and_member 
ON public.room_members (room_id, member_id);

CREATE POLICY "room_keys: users can insert wrapped keys if both are room members"
ON public.room_keys FOR INSERT TO authenticated
WITH CHECK (
  wrapped_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = room_keys.room_id 
      AND room_members.member_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = room_keys.room_id 
      AND room_members.member_id = room_keys.member_id
  )
);

CREATE POLICY "room_keys: users can update wrapped keys if they are room members and authors"
ON public.room_keys FOR UPDATE TO authenticated
USING (
  wrapped_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = room_keys.room_id 
      AND room_members.member_id = auth.uid()
  )
)
WITH CHECK (
  wrapped_by = auth.uid()
);