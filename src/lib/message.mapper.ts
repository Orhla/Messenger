import type { AttachmentMetadata, Message } from '@/lib/types.ts';
import {
    fetchRoomMessages,
    insertRoomMessage,
    subscribeToRoomMessages,
} from '@/lib/supabase/roomMessages.ts';
import {
    fetchDirectMessages,
    insertDirectMessage,
    subscribeToDirectMessages,
} from '@/lib/supabase/messages.ts';
import { getOrCreateChatKey } from '@/lib/chatKeyManager';
import { encryptBytes, encryptText } from '@/lib/crypto';
import { getRoomKey } from '@/lib/roomKeyManager';
import { uploadAttachment } from '@/lib/supabase/attachments';

type FetchMessagesParams =
    | {
          type: 'direct';
          correspondentId: string;
          currentUserId: string;
      }
    | {
          type: 'room';
          chatId: string;
      };

type SendMessageParams =
    | {
          type: 'direct';
          text: string;
          senderId: string;
          receiverId: string;
          attachment?: AttachmentMetadata;
      }
    | {
          type: 'room';
          text: string;
          senderId: string;
          chatId: string;
          attachment?: AttachmentMetadata;
      };

type SubscribeMessagesParams =
    | { type: 'direct'; currentUserId: string; correspondentId: string }
    | { type: 'room'; chatId: string };

type SendFileParams =
    | { type: 'direct'; file: File; senderId: string; receiverId: string }
    | { type: 'room'; file: File; senderId: string; chatId: string };

export async function fetchMessages(
    params: FetchMessagesParams,
): Promise<Message[]> {
    if (params.type === 'direct') {
        const messages = await fetchDirectMessages(
            params.currentUserId,
            params.correspondentId,
        );
        return messages.map((msg) => ({
            id: msg.id,
            senderId: msg.sender_id,
            senderLabel: msg.profiles?.email || msg.sender_id,
            text: msg.text,
            createdAt: msg.created_at,
            attachment: msg.attachment,
        }));
    }

    if (params.type === 'room') {
        const messages = await fetchRoomMessages(params.chatId);
        return messages;
    }

    throw new Error('Invalid parameters');
}

export async function sendMessage(params: SendMessageParams): Promise<void> {
    if (params.type === 'direct') {
        const aesKey = await getOrCreateChatKey(params.receiverId);
        const { ciphertext, iv } = await encryptText(aesKey, params.text);

        await insertDirectMessage({
            ciphertext,
            iv,
            receiver_id: params.receiverId,
            sender_id: params.senderId,
            attachment_path: params.attachment?.path,
            attachment_name: params.attachment?.name,
            attachment_size: params.attachment?.size,
            attachment_mime: params.attachment?.mime,
        });
        return;
    }

    if (params.type === 'room') {
        const roomKey = await getRoomKey(params.chatId, params.senderId);

        const { ciphertext, iv } = await encryptText(roomKey, params.text);

        await insertRoomMessage({
            ciphertext,
            iv,
            room_id: params.chatId,
            sender_id: params.senderId,
            attachment_path: params.attachment?.path,
            attachment_name: params.attachment?.name,
            attachment_size: params.attachment?.size,
            attachment_mime: params.attachment?.mime,
        });
        return;
    }

    throw new Error('Invalid chat type');
}

export function subscribeToMessages(
    params: SubscribeMessagesParams,
    onMessage: (message: Message) => void,
): () => void {
    if (params.type === 'direct') {
        return subscribeToDirectMessages(
            params.currentUserId,
            params.correspondentId,
            onMessage,
        );
    }

    if (params.type === 'room') {
        return subscribeToRoomMessages(params.chatId, onMessage);
    }

    throw new Error('Invalid subscription parameters');
}

export async function sendFile(params: SendFileParams): Promise<void> {
    const fileBuffer = await params.file.arrayBuffer();
    const fileUuid = crypto.randomUUID();

    if (params.type === 'direct') {
        const aesKey = await getOrCreateChatKey(params.receiverId);

        const encryptedFile = await encryptBytes(aesKey, fileBuffer);
        const encryptedText = await encryptText(aesKey, '', encryptedFile.iv);

        const minId =
            params.senderId < params.receiverId
                ? params.senderId
                : params.receiverId;
        const maxId =
            params.senderId > params.receiverId
                ? params.senderId
                : params.receiverId;
        const storagePath = `direct/${minId}_${maxId}/${fileUuid}`;

        const encryptedBlob = new Blob([encryptedFile.cipherbytes], {
            type: 'text/plain',
        });
        await uploadAttachment(storagePath, encryptedBlob);

        await insertDirectMessage({
            ciphertext: encryptedText.ciphertext,
            iv: encryptedFile.iv,
            receiver_id: params.receiverId,
            sender_id: params.senderId,
            attachment_path: storagePath,
            attachment_name: params.file.name,
            attachment_size: params.file.size,
            attachment_mime: params.file.type,
        });
        return;
    }

    if (params.type === 'room') {
        const roomKey = await getRoomKey(params.chatId, params.senderId);

        const encryptedFile = await encryptBytes(roomKey, fileBuffer);
        const encryptedText = await encryptText(roomKey, '', encryptedFile.iv);

        const storagePath = `room/${params.chatId}/${fileUuid}`;

        const encryptedBlob = new Blob([encryptedFile.cipherbytes], {
            type: 'text/plain',
        });
        await uploadAttachment(storagePath, encryptedBlob);

        await insertRoomMessage({
            ciphertext: encryptedText.ciphertext,
            iv: encryptedFile.iv,
            room_id: params.chatId,
            sender_id: params.senderId,
            attachment_path: storagePath,
            attachment_name: params.file.name,
            attachment_size: params.file.size,
            attachment_mime: params.file.type,
        });
        return;
    }

    throw new Error('Invalid chat type');
}
