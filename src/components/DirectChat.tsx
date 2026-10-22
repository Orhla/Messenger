import { useAuth } from '@/context/AuthContext';
import {
    fetchMessages,
    sendFile,
    sendMessage,
    subscribeToMessages,
} from '@/lib/message.mapper';
import { fetchProfileById } from '@/lib/profiles';
import type { Message, Profile } from '@/lib/types';
import { useEffect, useState } from 'react';
import ChatView from '@/components/ChatView';
import EmptyState from '@/components/EmptyState';
import { signOut } from '@/lib/auth';
import { downloadMessageFile } from '@/lib/message.decrypter';

type Props = {
    chatId: string;
};

export default function DirectChat({ chatId }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeChat, setActiveChat] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    // Загрузка информации о профиле собеседника
    useEffect(() => {
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
    async function send(messageText: string, file: File | null) {
        if (!activeChat) return;
        try {
            if (file) {
                await sendFile({
                    type: 'direct',
                    file,
                    senderId: currentUserId,
                    receiverId: activeChat.id,
                });
                return;
            }

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

    async function handleDownloadFile(messageId: string) {
        const msg = messages.find((m) => m.id === messageId);
        const attachment = msg?.attachment;

        if (!attachment) {
            console.error('Данные вложения отсутствуют');
            return;
        }

        try {
            const decryptedBlob = await downloadMessageFile(
                messageId,
                'direct',
                currentUserId,
            );

            const url = window.URL.createObjectURL(decryptedBlob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', attachment.name);
            document.body.appendChild(link);
            link.click();

            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            console.error('Не удалось скачать или расшифровать файл');
        }
    }

    if (isLoading || !activeChat) {
        return (
            <EmptyState
                loading={isLoading}
                notFound={!isLoading && !activeChat}
            />
        );
    }

    return (
        <ChatView
            chatTitle={activeChat.email}
            messages={messages}
            members={activeChat ? [activeChat] : []}
            onSend={send}
            onSignOut={signOut}
            onDownloadFile={handleDownloadFile}
        />
    );
}
