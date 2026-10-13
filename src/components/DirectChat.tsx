import { useAuth } from '@/context/AuthContext';
import {
    fetchMessages,
    sendMessage,
    subscribeToMessages,
} from '@/lib/message.mapper';
import { fetchProfileById } from '@/lib/profiles';
import type { Message, Profile } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatView from '@/components/ChatView';
import EmptyState from '@/components/EmptyState';
import { signOut } from '@/lib/auth';

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(value: string) {
    return typeof value === 'string' && UUID_REGEX.test(value);
}

export default function DirectChat() {
    const { chatId } = useParams<{ chatId: string }>();

    const [messages, setMessages] = useState<Message[]>([]);
    const [activeChat, setActiveChat] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    // Загрузка информации о профиле собеседника
    useEffect(() => {
        if (!chatId || !isUUID(chatId)) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        let isCurrent = true;

        fetchProfileById(chatId)
            .then((profile) => {
                if (!isCurrent) return;
                if (profile) {
                    setActiveChat(profile);
                } else {
                    setActiveChat(null);
                }
            })
            .catch(() => {
                if (isCurrent) setActiveChat(null);
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
        if (!chatId || !isUUID(chatId)) return;

        setMessages([]);
        let isCurrent = true;

        fetchMessages({
            type: 'direct',
            currentUserId,
            correspondentId: chatId,
        })
            .then((directMsgs: Message[]) => {
                if (!isCurrent) return;
                setMessages(directMsgs);
            })
            .catch(console.error);

        const unsubscribe = subscribeToMessages(
            { type: 'direct', currentUserId, correspondentId: chatId },
            (newMessage: Message) => {
                setMessages((prev) => {
                    if (prev.some((msg) => msg.id === newMessage.id))
                        return prev;
                    return [...prev, newMessage];
                });
            },
        );

        return () => {
            isCurrent = false;
            if (unsubscribe) unsubscribe();
        };
    }, [chatId, currentUserId]);

    // Единый метод отправки
    async function send(messageText: string) {
        if (!activeChat) return;
        try {
            await sendMessage({
                type: 'direct',
                text: messageText,
                senderId: currentUserId,
                receiverId: activeChat.id,
            });
        } catch (error) {
            console.error('Не удалось отправить сообщение', error);
        }
    }

    if (isLoading || !chatId || !isUUID(chatId) || !activeChat) {
        return (
            <EmptyState
                loading={isLoading}
                invalid={!!chatId && !isUUID(chatId)}
                notFound={!!chatId && !activeChat}
            />
        );
    }

    return (
        <ChatView
            chatTitle={activeChat.email}
            messages={messages}
            onSend={send}
            onSignOut={signOut}
        />
    );
}
