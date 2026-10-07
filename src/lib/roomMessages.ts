import { supabase } from '@/supabase';
import type { GroupChatMessage } from '@/lib/types';

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

export function subscribeToRoomMessages(
    chatId: string,
    onMessage: (message: GroupChatMessage) => void,
): () => void {
    const channel = supabase
        .channel(`chat-${chatId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'room_messages',
                filter: `room_id=eq.${chatId}`,
            },
            async ({ new: message }: { new: GroupChatMessage }) => {
                onMessage(message);
            },
        )
        .subscribe();

    return () => channel.unsubscribe();
}
