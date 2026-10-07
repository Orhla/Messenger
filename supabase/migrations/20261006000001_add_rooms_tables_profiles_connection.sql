ALTER TABLE public.rooms
  ADD CONSTRAINT fk_rooms_creator
  FOREIGN KEY (creator) 
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.room_members
  ADD CONSTRAINT fk_room_members_member
  FOREIGN KEY (member_id) 
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.room_messages
  ADD CONSTRAINT fk_room_messages_sender
  FOREIGN KEY (sender_id) 
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;