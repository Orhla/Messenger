import {
    broadcastCallSignal,
    getCallChannelId,
    subscribeToCallSignals,
} from '@/lib/supabase/signaling';
import type {
    CallSignal,
    CallState,
    UseWebRTCOptions,
    UseWebRTCResult,
} from '@/lib/types';
import { useEffect, useRef, useState } from 'react';

const RTC_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function useWebRTC({
    currentUserId,
    peerId,
    onSystemMessage,
}: UseWebRTCOptions): UseWebRTCResult {
    const [callState, setCallState] = useState<CallState>({ status: 'idle' });
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

    const channelId = getCallChannelId(currentUserId, peerId);

    const callStateRef = useRef<CallState>(callState);
    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    const processIceQueue = async (pc: RTCPeerConnection) => {
        console.log(
            `[WebRTC] Обработка накопленных ICE-кандидатов из очереди: ${iceCandidateQueueRef.current.length}`,
        );
        while (iceCandidateQueueRef.current.length > 0) {
            const candidate = iceCandidateQueueRef.current.shift();
            if (candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error(
                        '[WebRTC] Ошибка добавления кандидата из очереди:',
                        e,
                    );
                }
            }
        }
    };

    const createPeerConnection = (stream: MediaStream): RTCPeerConnection => {
        const pc = new RTCPeerConnection(RTC_CONFIG);

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const candStr = JSON.stringify(event.candidate);
                console.log(
                    `[WebRTC] Сгенерирован ICE-кандидат: ${candStr.slice(0, 60)}...`,
                );

                broadcastCallSignal(channelId, {
                    type: 'ice-candidate',
                    candidate: event.candidate.toJSON(),
                    from: currentUserId,
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            console.log(`[WebRTC] Изменение iceConnectionState: ${state}`);

            if (state === 'connected' || state === 'completed') {
                setCallState({
                    status: 'connected',
                    peerId,
                    startedAt: Date.now(),
                });
                onSystemMessage('Звонок успешно установлен');
            }
        };

        pc.ontrack = (event) => {
            console.log('[WebRTC] Получен удаленный медиа-трек');
            if (event.streams && event.streams[0]) {
                if (audioRef.current) {
                    audioRef.current.pause();
                }

                const audio = new Audio();
                audio.srcObject = event.streams[0];
                audioRef.current = audio;

                audio
                    .play()
                    .then(() =>
                        console.log(
                            '[WebRTC] Удаленный аудиострим воспроизводится',
                        ),
                    )
                    .catch((err) =>
                        console.error(
                            '[WebRTC] Ошибка автовоспроизведения аудио:',
                            err,
                        ),
                    );
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    };

    const cleanup = () => {
        console.log('[WebRTC] Запущена очистка ресурсов (cleanup)...');

        if (peerConnectionRef.current) {
            const pc = peerConnectionRef.current;

            try {
                pc.getSenders().forEach((sender) => {
                    if (sender.track) {
                        sender.track.stop();
                        console.log(
                            `[WebRTC] Трек ${sender.track.kind} успешно остановлен через sender`,
                        );
                    }
                });
            } catch (e) {
                console.error(
                    '[WebRTC] Ошибка при остановке треков через getSenders():',
                    e,
                );
            }

            pc.onicecandidate = null;
            pc.oniceconnectionstatechange = null;
            pc.ontrack = null;

            pc.close();
            peerConnectionRef.current = null;
        }

        if (localStream) {
            localStream.getTracks().forEach((track) => {
                track.stop();
                console.log(
                    `[WebRTC] Локальный трек ${track.kind} остановлен напрямую`,
                );
            });
            setLocalStream(null);
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.srcObject = null;
            audioRef.current = null;
        }

        iceCandidateQueueRef.current = [];
        console.log('[WebRTC] Буфер ICE-кандидатов успешно очищен');

        setCallState({ status: 'idle' });
    };

    const initLocalStream = async (): Promise<MediaStream> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true,
            });
            setLocalStream(stream);
            return stream;
        } catch (error) {
            onSystemMessage('Не удалось получить доступ к микрофону');
            throw error;
        }
    };

    // --- СЦЕНАРИИ ЗВОНКА ---

    // 1. Инициация звонка (Вы звоните)
    const startCall = async () => {
        if (callState.status !== 'idle') return;

        try {
            onSystemMessage('Инициализация звонка...');
            console.log('[WebRTC] Запрашиваем микрофон...');

            const stream = await initLocalStream();

            const pc = createPeerConnection(stream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            console.log(
                `[WebRTC] Отправляем Offer. Длина SDP: ${offer.sdp?.length || 0} символов.`,
            );
            await broadcastCallSignal(channelId, {
                type: 'offer',
                sdp: offer,
                from: currentUserId,
            });

            setCallState({ status: 'calling', peerId });
        } catch (error) {
            console.error('Ошибка при старте звонка:', error);
            cleanup();
        }
    };

    // 2. Принятие входящего звонка
    const acceptCall = async () => {
        if (callState.status !== 'ringing' || !callState.offer) return;
        const currentOffer = callState.offer;

        try {
            onSystemMessage('Принятие звонка...');
            console.log('[WebRTC] Запрашиваем микрофон для ответа...');

            const stream = await initLocalStream();
            setLocalStream(stream);

            const pc = createPeerConnection(stream);

            console.log('[WebRTC] Устанавливаем RemoteDescription (Offer)...');
            await pc.setRemoteDescription(
                new RTCSessionDescription(currentOffer),
            );

            await processIceQueue(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log(
                `[WebRTC] Отправляем Answer. Длина SDP: ${answer.sdp?.length || 0} символов.`,
            );
            await broadcastCallSignal(channelId, {
                type: 'answer',
                sdp: answer,
                from: currentUserId,
            });

            setCallState({ status: 'connecting', peerId });
        } catch (error) {
            console.error('Ошибка при принятии звонка:', error);
            cleanup();
        }
    };

    // 3. Отклонение входящего звонка
    const rejectCall = () => {
        if (callStateRef.current.status !== 'ringing') return;

        broadcastCallSignal(channelId, {
            type: 'call-reject',
            from: currentUserId,
        });

        cleanup();
        onSystemMessage('Вы отклонили входящий звонок');
    };

    // 4. Завершение вызова
    const hangUp = () => {
        const currentState = callStateRef.current;
        let durationMessage = '';

        if (currentState.status === 'connected' && currentState.startedAt) {
            const durationMs = Date.now() - currentState.startedAt;
            const totalSeconds = Math.floor(durationMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            durationMessage = ` (Длительность: ${formattedTime})`;
        }

        broadcastCallSignal(channelId, {
            type: 'call-end',
            from: currentUserId,
        });

        cleanup();

        onSystemMessage(`Звонок завершен: ${durationMessage}`);
    };

    useEffect(() => {
        async function handleIncomingSignal(signal: CallSignal) {
            if (signal.from === currentUserId) return;

            const currentState = callStateRef.current;

            switch (signal.type) {
                case 'offer':
                    if (currentState.status !== 'idle') {
                        console.log(
                            `[WebRTC] Занят. Автоматически отклоняем звонок от ${signal.from}`,
                        );
                        broadcastCallSignal(channelId, {
                            type: 'call-reject',
                            from: currentUserId,
                        });
                        return;
                    }
                    onSystemMessage('📡 Входящий звонок...');
                    setCallState({
                        status: 'ringing',
                        peerId: signal.from,
                        offer: signal.sdp,
                    });
                    break;

                case 'answer':
                    if (
                        currentState.status === 'calling' &&
                        peerConnectionRef.current
                    ) {
                        console.log(
                            `[WebRTC] Получен Answer от ${signal.from}. Устанавливаем RemoteDescription...`,
                        );
                        const pc = peerConnectionRef.current;

                        await pc.setRemoteDescription(
                            new RTCSessionDescription(signal.sdp),
                        );
                        await processIceQueue(pc);

                        onSystemMessage('Соединение устанавливается...');
                        setCallState({
                            status: 'connecting',
                            peerId: signal.from,
                        });
                    }
                    break;

                case 'ice-candidate':
                    if (signal.candidate) {
                        const pc = peerConnectionRef.current;

                        if (
                            pc &&
                            pc.remoteDescription &&
                            pc.remoteDescription.type
                        ) {
                            try {
                                await pc.addIceCandidate(
                                    new RTCIceCandidate(signal.candidate),
                                );
                            } catch (e) {
                                console.error(
                                    '[WebRTC] Ошибка добавления ICE-кандидата напрямую:',
                                    e,
                                );
                            }
                        } else {
                            console.log(
                                '[WebRTC] Удаленное описание еще не задано. Буферизируем ICE-кандидат.',
                            );
                            iceCandidateQueueRef.current.push(signal.candidate);
                        }
                    }
                    break;

                case 'call-end':
                case 'call-reject': {
                    const reason =
                        signal.type === 'call-reject'
                            ? 'отклонил звонок или занят'
                            : 'завершил звонок';
                    onSystemMessage(`Собеседник ${reason}`);
                    cleanup();
                    break;
                }
            }
        }

        const unsubscribe = subscribeToCallSignals(
            channelId,
            handleIncomingSignal,
        );

        return () => {
            unsubscribe();
        };
    }, [channelId, currentUserId]);

    return {
        callState,
        startCall,
        acceptCall,
        rejectCall,
        hangUp,
    };
}
