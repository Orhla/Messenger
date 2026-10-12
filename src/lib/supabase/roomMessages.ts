import type { GroupChatMessage } from '@/lib/types.ts';
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
