import { supabase } from '@/supabase';
import type { ChatMessage } from '@/lib/types';

export async function fetchMessages(
    correspondentId: string,
): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${correspondentId},receiver_id.eq.${correspondentId}`)
        .order('created_at');

    if (error) throw error;
    return data;
}

export async function sendMessage(
    text: string,
    receiverId: string,
): Promise<void> {
    const { error } = await supabase
        .from('messages')
        .insert({ text, receiver_id: receiverId
        });
    if (error) throw error;
}

export function subscribeToMessages(
    currentUserId: string,
    receiverId: string,
    onMessage: (message: ChatMessage) => void,
): () => void {
    const chatId = [currentUserId, receiverId].sort().join('_');
    const channel = supabase
        .channel(`chat-${chatId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            ({ new: message }) => {
                const m = message as ChatMessage;
                if (
                    m.sender_id === receiverId ||
                    m.receiver_id === receiverId
                ) {
                    onMessage(m);
                }
            },
        )
        .subscribe();

    return () => channel.unsubscribe();
}
