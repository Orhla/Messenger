import type { Message } from '@/lib/types.ts';
import { fetchRoomMessages } from '@/lib/supabase/roomMessages.ts';
import { fetchDirectMessages } from '@/lib/supabase/messages.ts';

type FetchMessagesParams = {
    type: "direct"
    correspondentId: string;
    currentUserId: string;
} | {
    type: "room"
    chatId: string;
};

export async function fetchMessages(params: FetchMessagesParams): Promise<Message[]> {
    if (params.type === "direct") {
        const messages = await fetchDirectMessages(params.currentUserId, params.correspondentId);
        console.log("Fetched direct messages:", messages);
        return messages.map((msg) => ({
            id: msg.id,
            senderId: msg.sender_id,
            senderLabel: msg.profiles?.email || msg.sender_id,
            text: msg.text,
            createdAt: msg.created_at,
        }));
        // return messages;
    }

    if (params.type === "room") {
        const messages = await fetchRoomMessages(params.chatId);
        console.log('Fetched room messages:', messages);
        return messages.map(msg => ({
            id: msg.id,
            senderId: msg.sender_id,
            senderLabel: msg?.profiles?.email || "Unknown",
            text: msg.text,
            createdAt: msg.created_at,
        }));
    }

    throw new Error("Invalid parameters");
};
