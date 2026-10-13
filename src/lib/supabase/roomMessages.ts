import type { GroupChatMessage, Message } from '@/lib/types.ts';
import { supabase } from '@/supabase.ts';

export async function fetchRoomMessages(
    chatId: string,
): Promise<GroupChatMessage[]> {
    const { data, error } = await supabase
        .from('room_messages')
        .select('*, profiles(email)')
        .eq('room_id', chatId)
        .order('created_at');

    if (error) throw error;

    return data;
}

export async function sendRoomMessage(
    text: string,
    senderId: string,
    chatId: string,
): Promise<void> {
    const { error } = await supabase.from('room_messages').insert({
        text: text,
        room_id: chatId,
        sender_id: senderId,
    });
    if (error) throw error;
}

export async function insertRoomMessage(payload: {
    text: string;
    room_id: string;
    sender_id: string;
}): Promise<void> {
    const { error } = await supabase.from('room_messages').insert(payload);
    if (error) throw error;
}

export function subscribeToRoomMessages(
    chatId: string,
    onMessage: (message: Message) => void,
): () => void {
    const channel = supabase
        .channel(`room-chat-${chatId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'room_messages',
                filter: `room_id=eq.${chatId}`,
            },
            ({ new: message }: { new: GroupChatMessage }) => {
                const mappedMessage: Message = {
                    id: message.id,
                    senderId: message.sender_id,
                    senderLabel: (message as any).profiles?.email || 'Unknown',
                    text: message.text,
                    createdAt: message.created_at,
                };

                onMessage(mappedMessage);
            },
        )
        .subscribe();

    return () => channel.unsubscribe();
}
