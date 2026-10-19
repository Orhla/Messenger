import type { DbRoomKeyRow } from '@/lib/types';
import { supabase } from '@/supabase';

export async function insertRoomKeys(rows: DbRoomKeyRow[]): Promise<void> {
    const { error } = await supabase.from('room_keys').insert(rows);

    if (error) {
        throw new Error(`Не удалось сохранить ключи комнаты`);
    }
}

export async function fetchRoomKey(
    roomId: string,
    memberId: string,
): Promise<DbRoomKeyRow | null> {
    const { data, error } = await supabase
        .from('room_keys')
        .select('room_id, member_id, wrapped_by, wrapped_key, iv')
        .eq('room_id', roomId)
        .eq('member_id', memberId)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}
