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

export default function Chat() {
    const { correspondentId } = useParams<{ correspondentId?: string }>();
    const navigate = useNavigate();

    const [messages, setMessages] = useState<ChatMessage[] | null>(null);
    const [text, setText] = useState('');
    const [correspondent, setCorrespondent] = useState<Profile | null>(null);
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    useEffect(() => {
        if (!correspondentId) {
            setCorrespondent(null);
            return;
        }

        const cachedUser = localStorage.getItem(
            `user_cache_${correspondentId}`,
        );
        if (cachedUser) {
            try {
                setCorrespondent(JSON.parse(cachedUser));
            } catch (e) {
                console.error('Ошибка чтения кэша');
            }
        }

        fetchProfileById(correspondentId)
            .then((freshProfile) => {
                setCorrespondent(freshProfile);
                localStorage.setItem(
                    `user_cache_${correspondentId}`,
                    JSON.stringify(freshProfile),
                );
            })
            .catch(() => {
                console.error('Собеседник не найден');
                if (!cachedUser) navigate('/chat');
            });
    }, [correspondentId, navigate]);

    useEffect(() => {
        if (!correspondentId) {
            setMessages(null);
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
        localStorage.setItem(
            `user_cache_${profile.id}`,
            JSON.stringify(profile),
        );
        navigate(`/chat/${profile.id}`);
    }

    const chatTitle = correspondent ? correspondent.email : '';

    return (
        <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background">
            <ChatHeader
                buttonText="Выйти"
                chatName={chatTitle}
                onClick={signOut}
            />

            <SearchUsers onSelectReceiver={handleSelectReceiver} />

            <ChatArea messages={messages} />

            {correspondentId && (
                <ChatFooter
                    buttonText="Отправить"
                    inputPlaceholder="Напишите сообщение..."
                    messageText={text}
                    onChange={(e) => setText(e.target.value)}
                    onClick={send}
                    onKeyDown={(e) => e.key === 'Enter' && send()}
                />
            )}
        </div>
    );
}
