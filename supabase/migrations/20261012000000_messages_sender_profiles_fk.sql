ALTER TABLE public.messages
  ADD CONSTRAINT fk_messages_sender
  FOREIGN KEY (sender_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;
