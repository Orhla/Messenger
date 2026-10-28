import type { CallState } from '@/lib/types';
import { ArrowUpRight, Phone, PhoneOff } from 'lucide-react';
import { CallTimer } from '@/components/CallTimer';

type Props = {
    callState: CallState;
    peerEmail: string;
    onAccept: () => void;
    onReject: () => void;
    onHangUp: () => void;
};

export function CallOverlay({
    callState,
    peerEmail,
    onAccept,
    onReject,
    onHangUp,
}: Props) {
    if (callState.status === 'idle') return;

    return (
        <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-md text-slate-100">
                {/* 1. РЕЖИМ: Входящий звонок (ringing) */}
                {callState.status === 'ringing' && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 animate-bounce">
                            <Phone className="h-7 w-7" />
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                                Входящий аудиозвонок
                            </p>
                            <h3 className="mt-1 text-lg font-semibold truncate max-w-[320px]">
                                {peerEmail}
                            </h3>
                        </div>
                        <div className="flex w-full gap-3 pt-2">
                            <button
                                onClick={onReject}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-medium text-white transition hover:bg-red-700 active:scale-95"
                            >
                                <PhoneOff className="h-5 w-5" />
                                Отклонить
                            </button>
                            <button
                                onClick={onAccept}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700 active:scale-95"
                            >
                                <Phone className="h-5 w-5" />
                                Принять
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. РЕЖИМ: Исходящий вызов или согласование (calling / connecting) */}
                {(callState.status === 'calling' ||
                    callState.status === 'connecting') && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                            <ArrowUpRight className="h-7 w-7 animate-pulse" />
                            <span className="absolute inset-0 rounded-full border border-amber-500/30 animate-ping" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-slate-400">
                                {callState.status === 'calling'
                                    ? 'Вызов собеседника...'
                                    : 'Установление соединения...'}
                            </p>
                            <h3 className="mt-1 text-lg font-semibold truncate max-w-[320px]">
                                {peerEmail}
                            </h3>
                        </div>
                        <button
                            onClick={onHangUp}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 font-medium text-red-400 transition hover:bg-slate-700 active:scale-95"
                        >
                            <PhoneOff className="h-5 w-5" />
                            Отменить
                        </button>
                    </div>
                )}

                {/* 3. РЕЖИМ: Активный разговор (connected) */}
                {callState.status === 'connected' && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                            <Phone className="h-7 w-7 animate-pulse" />
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                                Звонок активен
                            </p>
                            <h3 className="mt-1 text-base text-slate-400 truncate max-w-[320px]">
                                {peerEmail}
                            </h3>
                            <div className="mt-2">
                                <CallTimer startedAt={callState.startedAt} />
                            </div>
                        </div>
                        <button
                            onClick={onHangUp}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-medium text-white transition hover:bg-red-700 active:scale-95"
                        >
                            <PhoneOff className="h-5 w-5" />
                            Завершить
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
