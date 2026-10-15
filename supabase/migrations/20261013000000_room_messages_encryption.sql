
DELETE FROM public.room_messages;

ALTER TABLE public.room_messages RENAME COLUMN text TO ciphertext;
ALTER TABLE public.room_messages ADD COLUMN iv TEXT NOT NULL;


CREATE TABLE public.room_keys (
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wrapped_by  UUID NOT NULL REFERENCES public.profiles(id),
  wrapped_key TEXT NOT NULL,
  iv          TEXT NOT NULL,
  PRIMARY KEY (room_id, member_id)
);


ALTER TABLE public.room_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_keys: users can read their own wrapped room keys"
ON public.room_keys
FOR SELECT
TO authenticated
USING (
  member_id = auth.uid()
);

CREATE POLICY "room_keys: users can insert wrapped keys if they are room members and authors"
ON public.room_keys
FOR INSERT
TO authenticated
WITH CHECK (
  wrapped_by = auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM public.room_members
    WHERE room_members.room_id = room_keys.room_id
      AND room_members.member_id = auth.uid()
  )
);

CREATE POLICY "room_keys: users can update wrapped keys if they are room members and authors"
ON public.room_keys
FOR UPDATE
TO authenticated
USING (
  wrapped_by = auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM public.room_members
    WHERE room_members.room_id = room_keys.room_id
      AND room_members.member_id = auth.uid()
  )
)
WITH CHECK (
  wrapped_by = auth.uid()
);