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
import { useNavigate, useParams } from 'react-router-dom';
import { fetchProfileById } from '@/lib/profiles';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(value: string) {
    return typeof value === 'string' && UUID_REGEX.test(value);
}


export default function Chat() {
    const { correspondentId } = useParams<{ correspondentId: string }>();
    const navigate = useNavigate();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [correspondent, setCorrespondent] = useState<Profile | null>(null);
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    useEffect(() => {
        if (!correspondentId) throw new Error('correspondentId is required');
        if (!isUUID(correspondentId)) {
            console.error('Некорректный ID собеседника');
            return
        }
        fetchProfileById(correspondentId)
            .then((freshProfile) => {
                setCorrespondent(freshProfile);
            })
            .catch(() => {
                console.error('Собеседник не найден');
            });
    }, [correspondentId, navigate]);

    useEffect(() => {
        if (!correspondentId) throw new Error('correspondentId is required');
        if (!isUUID(correspondentId)) {
            console.error('Некорректный ID собеседника');
            return;
        }
        fetchMessages(currentUserId, correspondentId).then(setMessages);

        const unsubscribe = subscribeToMessages(
            currentUserId,
            correspondentId,
            (newMessage) => {
                setMessages((prev) =>
                    prev ? [...prev, newMessage] : [newMessage],
                );
            },
        );

        return () => {
            unsubscribe();
        };
    }, [correspondentId]);

    async function send() {
        const trimmedText = text.trim();
        if (!trimmedText || !correspondent) return;
        setText('');
        try {
            await sendMessage(trimmedText, currentUserId, correspondent.id);
        } catch (error) {
            console.error('Не удалось отправить сообщение');
        }
    }

    function handleSelectReceiver(profile: Profile) {
        navigate(`/chat/${profile.id}`);
    }

    const chatTitle = correspondent ? correspondent.email : '';

    if (correspondentId && !isUUID(correspondentId)) {
        return (
            <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background">
                <p>Некорректный ID собеседника. Выберите другого собеседника</p>
                <SearchUsers onSelectReceiver={handleSelectReceiver} />
            </div>
        );
    }

    if (!correspondentId) {
        throw new Error('correspondentId is required');
    }

    if (!correspondent) {
        return (
            <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background">
                <p>Собеседник не найден. Выберите другого собеседника</p>
                <SearchUsers onSelectReceiver={handleSelectReceiver} />
            </div>
        );
    }


    return (
        <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background">
            <ChatHeader
                buttonText="Выйти"
                chatName={chatTitle}
                onClick={signOut}
            />

            <SearchUsers onSelectReceiver={handleSelectReceiver} />

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
