'use client';

import { useAuth } from '@/context/AuthContext';
import {
    fetchMessages,
    sendMessage,
    subscribeToMessages,
} from '@/lib/messages';
import { fetchProfileById } from '@/lib/profiles';
import type { ChatMessage, GroupChatMessage, Profile } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

    const [messages, setMessages] = useState<
        (ChatMessage | GroupChatMessage)[]
    >([]);
    const [activeChat, setActiveChat] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    useEffect(() => {
        if (!chatId || !isUUID(chatId)) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        fetchProfileById(chatId)
            .then((profile) => {
                if (profile) {
                    setActiveChat(profile);
                } else {
                    setActiveChat(null);
                }
            })
            .catch(() => setActiveChat(null))
            .finally(() => setIsLoading(false));
    }, [chatId]);

    useEffect(() => {
        if (!chatId || !isUUID(chatId)) return;

        setMessages([]);
        let unsubscribe: (() => void) | undefined;

        fetchMessages(currentUserId, chatId)
            .then((directMsgs: ChatMessage[]) => setMessages(directMsgs))
            .catch(console.error);

        unsubscribe = subscribeToMessages(
            currentUserId,
            chatId,
            (newMessage: ChatMessage) => {
                setMessages((prev) => {
                    if (prev.some((msg) => msg.id === newMessage.id))
                        return prev;
                    return [...prev, newMessage];
                });
            },
        );

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [chatId, currentUserId]);

    async function send(messageText: string) {
        if (!activeChat) return;
        try {
            await sendMessage(messageText, currentUserId, activeChat.id);
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
