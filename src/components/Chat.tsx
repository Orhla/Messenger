'use client';

import ChatHeader from '@/components/ChatHeader';
import ChatArea from '@/components/ChatArea';
import ChatFooter from '@/components/ChatFooter';
import { useEffect, useState } from 'react';
import type { ChatMessage, Profile } from '@/lib/types';
import { signOut } from '@/lib/auth';
import {
    fetchMessages,
    sendMessage,
    subscribeToMessages,
} from '@/lib/messages';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/context/AuthContext';
import SearchUsers from '@/components/SearchUsers';

export default function Chat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [receiver, setReceiver] = useState<Profile | null>(null);

    const { session, loading } = useAuth();
    if (!session) return <AuthForm />;
    if (loading) return null;

    useEffect(() => {
        if (!session || !receiver) {
            setMessages([]);
            return;
        }

        const currentUserId = session.user.id;
        const receiverId = receiver.id;

        fetchMessages(currentUserId, receiverId).then(setMessages);

        const unsubscribe = subscribeToMessages(
            currentUserId,
            receiverId,
            (newMessage) => {
                setMessages((prev) => [...prev, newMessage]);
            },
        );

        return () => {
            unsubscribe();
        };
    }, [session, receiver]);

    const currentUserId = session.user.id;

    async function send() {
        const trimmedText = text.trim();
        if (!trimmedText || !receiver) return;
        setText('');
        try {
            await sendMessage(trimmedText, receiver.id, currentUserId);
        } catch (error) {
            console.error('Не удалось отправить сообщение');
        }
    }

    const chatTitle = receiver ? receiver.email : 'Выберите собеседника...';

    return (
        <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background">
            <ChatHeader
                buttonText="Выйти"
                chatName={chatTitle}
                onClick={signOut}
            />

            <SearchUsers onSelectReceiver={setReceiver} />

            <ChatArea author={currentUserId} messages={messages} />

            <ChatFooter
                buttonText="Отправить"
                inputPlaceholder="Напишите сообщение..."
                messageText={text}
                onChange={(e) => setText(e.target.value)}
                onClick={send}
                onKeyDown={(e) => e.key === 'Enter' && send()}
            />
        </div>
    );
}
