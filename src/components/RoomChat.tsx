import { useEffect, useState } from 'react';
import type { Message, Profile, Room } from '@/lib/types';
import { signOut } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { addMember, removeMember, getRoomMembers, getRooms } from '@/lib/rooms'; // Импортируем removeMember для отката
import {
    fetchMessages,
    sendMessage,
    subscribeToMessages,
} from '@/lib/message.mapper.ts';
import { shareRoomKey } from '@/lib/roomKeyManager'; // Импортируем шеринг ключей
import EmptyState from '@/components/EmptyState';
import MembersPanel from '@/components/MembersPanel';
import ChatView from '@/components/ChatView';
import { toast } from '@/components/ui/toast';

export default function RoomChat({ chatId }: { chatId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeChat, setActiveChat] = useState<Room | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [members, setMembers] = useState<Profile[]>([]);
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    // Загрузка информации о комнате и её участниках
    useEffect(() => {
        setIsLoading(true);
        let isCurrent = true;

        Promise.all([
            getRooms().then((rooms) => rooms.find((r) => r.id === chatId)),
            getRoomMembers(chatId).catch(() => []),
        ])
            .then(([foundRoom, roomMembers]) => {
                if (!isCurrent) return;
                if (foundRoom) {
                    setActiveChat(foundRoom);
                    setMembers(roomMembers);
                } else {
                    setActiveChat(null);
                    setMembers([]);
                }
            })
            .catch(() => {
                if (isCurrent) {
                    setActiveChat(null);
                    setMembers([]);
                }
            })
            .finally(() => {
                if (isCurrent) setIsLoading(false);
            });

        return () => {
            isCurrent = false;
        };
    }, [chatId]);

    // Загрузка истории сообщений и Realtime-подписка
    useEffect(() => {
        setMessages([]);
        let isCurrent = true;

        fetchMessages({ type: 'room', chatId })
            .then((roomMsgs) => {
                if (!isCurrent) return;
                setMessages(roomMsgs);
            })
            .catch(console.error);

        const unsubscribe = subscribeToMessages(
            { type: 'room', chatId },
            (newMessage: Message) => {
                if (!isCurrent) return;
                setMessages((prev) => {
                    if (prev.some((msg) => msg.id === newMessage.id))
                        return prev;

                    if (
                        newMessage.senderId === currentUserId &&
                        session?.user?.email
                    ) {
                        newMessage.senderLabel = session.user.email;
                    }

                    return [...prev, newMessage];
                });
            },
        );

        return () => {
            isCurrent = false;
            if (unsubscribe) unsubscribe();
        };
    }, [chatId, currentUserId, session?.user?.email]);

    const handleAddMember = async (profile: Profile) => {
        if (!chatId) return;

        try {
            await addMember(chatId, profile.id);

            try {
                await shareRoomKey(chatId, currentUserId, profile.id);

                setMembers((prev) => {
                    if (prev.some((m) => m.id === profile.id)) return prev;
                    return [...prev, profile];
                });
            } catch (cryptoError) {
                console.error(
                    'Ошибка при передаче ключа комнаты:',
                    cryptoError,
                );

                await removeMember(chatId, profile.id);

                toast.add({
                    type: 'destructive',
                    title: 'Ошибка безопасности',
                    description:
                        'Не удалось передать ключ шифрования. Пользователь не добавлен.',
                });
            }
        } catch (error) {
            console.error(
                'Не удалось добавить участника в комнату на уровне БД',
                error,
            );
            toast.add({
                type: 'destructive',
                title: 'Ошибка безопасности',
                description: 'Ошибка при добавлении участника в комнату.',
            });
        }
    };

    // Единый метод отправки
    async function send(messageText: string) {
        if (!activeChat) return;
        try {
            await sendMessage({
                type: 'room',
                text: messageText,
                senderId: currentUserId,
                chatId: activeChat.id,
            });
        } catch (error) {
            console.error('Не удалось отправить сообщение', error);
        }
    }

    if (isLoading || !activeChat) {
        return (
            <EmptyState
                loading={isLoading}
                notFound={!!chatId && !activeChat}
            />
        );
    }

    return (
        <ChatView
            chatTitle={activeChat.room_name}
            messages={messages}
            onSend={send}
            onSignOut={signOut}
        >
            <MembersPanel members={members} onAddMember={handleAddMember} />
        </ChatView>
    );
}
