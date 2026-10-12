'use client';

import ChatHeader from '@/components/ChatHeader';
import ChatArea from '@/components/ChatArea';
import ChatFooter from '@/components/ChatFooter';
import { useState } from 'react';
import type { ChatMessage, GroupChatMessage } from '@/lib/types';

type Props = {
    chatTitle: string;
    messages: (ChatMessage | GroupChatMessage)[];
    onSend: (text: string) => Promise<void>;
    onSignOut: () => void;
    children?: React.ReactNode;
};

export default function ChatView({
    chatTitle,
    messages,
    onSend,
    onSignOut,
    children,
}: Props) {
    const [text, setText] = useState('');

    const handleSend = async () => {
        const trimmedText = text.trim();
        if (!trimmedText) return;

        await onSend(trimmedText);
        setText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <>
            <ChatHeader
                buttonText="Выйти"
                chatName={chatTitle}
                onClick={onSignOut}
            >
                {children}
            </ChatHeader>

            <ChatArea messages={messages} />

            <ChatFooter
                buttonText="Отправить"
                inputPlaceholder="Напишите сообщение..."
                messageText={text}
                onChange={(e) => setText(e.target.value)}
                onClick={handleSend}
                onKeyDown={handleKeyDown}
            />
        </>
    );
}
