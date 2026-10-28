import type { CallSignal } from '@/lib/types';
import { supabase } from '@/supabase';

export function getCallChannelId(userA: string, userB: string): string {
    const sortedUsers = [userA, userB].sort().join('_');
    return `call:${sortedUsers}`;
}

export function subscribeToCallSignals(
    channelId: string,
    onSignal: (signal: CallSignal) => void,
): () => void {
    console.log(`[Signaling] Подписываемся на канал: ${channelId}`);
    const channel = supabase.channel(channelId);

    channel
        .on(
            'broadcast',
            { event: 'signal' },
            (payload: { payload: CallSignal }) => {
                onSignal(payload.payload);
            },
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[Signaling] Канал ${channelId} подключён`);
            }
        });

    return () => {
        supabase
            .removeChannel(channel)
            .then(() =>
                console.log(`[Signaling] Отписываемся от канала: ${channelId}`),
            )
            .catch((err) =>
                console.error(`[Signaling] Ошибка при отписке от канала`, err),
            );
    };
}

export async function broadcastCallSignal(
    channelId: string,
    signal: CallSignal,
): Promise<void> {
    const channel = supabase.channel(channelId);

    try {
        await channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: signal,
        });
    } catch {
        console.error(
            `[Signaling] Ошибка отправки сигнала в канал ${channelId}`,
        );
    }
}
