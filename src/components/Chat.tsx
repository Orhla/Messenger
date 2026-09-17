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
import { useAuth } from '@/context/AuthContext';
import SearchUsers from '@/components/SearchUsers';

export default function Chat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [correspondent, setCorrespondent] = useState<Profile | null>(null);
    const {session} = useAuth();
    useEffect(() => {
        if (!correspondent) {
            setMessages([]);
            return;
        }

        const currentUserId = session!.user.id;
        const receiverId = correspondent.id;

        fetchMessages(correspondent.id).then(setMessages);

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
    }, [correspondent]);

    async function send() {
        const trimmedText = text.trim();
        if (!trimmedText || !correspondent) return;
        setText('');
        try {
            await sendMessage(trimmedText, correspondent.id);
        } catch (error) {
            console.error('Не удалось отправить сообщение');
        }
    }

    const chatTitle = correspondent ? correspondent.email : 'Выберите собеседника...';

    return (
        <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background">
            <ChatHeader
                buttonText="Выйти"
                chatName={chatTitle}
                onClick={signOut}
            />

            <SearchUsers onSelectReceiver={setCorrespondent} />

            <ChatArea messages={messages} />

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
