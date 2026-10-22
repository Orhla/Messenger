ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_path TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachment_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachment_size BIGINT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachment_mime TEXT DEFAULT NULL;

ALTER TABLE room_messages 
ADD COLUMN IF NOT EXISTS attachment_path TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachment_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachment_size BIGINT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachment_mime TEXT DEFAULT NULL;

DROP POLICY IF EXISTS "room_messages: files access for room members" ON storage.objects;
DROP POLICY IF EXISTS "messages: files access for direct chats" ON storage.objects;

CREATE POLICY "room_messages: files access for room members" 
ON storage.objects
FOR ALL 
TO authenticated 
USING (
    bucket_id = 'attachments' 
    AND (storage.foldername(name))[1] = 'room'
    AND is_room_member(
        ((storage.foldername(name))[2])::uuid, 
        auth.uid()
    )
);

CREATE POLICY "messages: files access for direct chats" 
ON storage.objects
FOR ALL 
TO authenticated 
USING (
    bucket_id = 'attachments' 
    AND (storage.foldername(name))[1] = 'direct'
    AND (
        auth.uid()::text = split_part((storage.foldername(name))[2], '_', 1)
        OR 
        auth.uid()::text = split_part((storage.foldername(name))[2], '_', 2)
    )
);