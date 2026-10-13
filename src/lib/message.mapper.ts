import type { Message } from '@/lib/types.ts';
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
import { encryptText } from '@/lib/crypto';

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
    | { type: 'direct'; text: string; senderId: string; receiverId: string }
    | { type: 'room'; text: string; senderId: string; chatId: string };

type SubscribeMessagesParams =
    | { type: 'direct'; currentUserId: string; correspondentId: string }
    | { type: 'room'; chatId: string };

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
        }));
    }

    if (params.type === 'room') {
        const messages = await fetchRoomMessages(params.chatId);
        return messages.map((msg) => ({
            id: msg.id,
            senderId: msg.sender_id,
            senderLabel: msg?.profiles?.email || 'Unknown',
            text: msg.text,
            createdAt: msg.created_at,
        }));
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
        });
        return;
    }

    if (params.type === 'room') {
        await insertRoomMessage({
            text: params.text,
            room_id: params.chatId,
            sender_id: params.senderId,
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
