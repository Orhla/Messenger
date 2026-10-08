'use client';

import ChatHeader from '@/components/ChatHeader';
import ChatArea from '@/components/ChatArea';
import ChatFooter from '@/components/ChatFooter';
import { useEffect, useState } from 'react';
import type {
    ActiveChat,
    ChatMessage,
    GroupChatMessage,
    Profile,
    Room,
} from '@/lib/types';
import { signOut } from '@/lib/auth';
import {
    fetchMessages,
    sendMessage,
    subscribeToMessages,
} from '@/lib/messages';
import { useAuth } from '@/context/AuthContext';
import SearchUsers from '@/components/SearchUsers';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchProfileById } from '@/lib/profiles';
import { getRooms } from '@/lib/rooms';
import { useRoomMembers } from '@/hooks/useRoomMembers';
import Sidebar from '@/components/Sidebar';
import {
    fetchRoomMessages,
    sendRoomMessage,
    subscribeToRoomMessages,
} from '@/lib/roomMessages';

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(value: string) {
    return typeof value === 'string' && UUID_REGEX.test(value);
}

export default function Chat() {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [messages, setMessages] = useState<
        (ChatMessage | GroupChatMessage)[]
    >([]);
    const [text, setText] = useState('');
    const [activeChat, setActiveChat] = useState<ActiveChat>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    const isRoomType = location.pathname.includes('/chat/room/');
    const { members, addMember } = useRoomMembers(
        isRoomType && chatId && isUUID(chatId) ? chatId : null,
    );

    // Загрузка сущности (Профиль или Комната) в зависимости от URL
    useEffect(() => {
        if (!chatId || !isUUID(chatId)) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        if (isRoomType) {
            getRooms()
                .then((rooms) => {
                    const foundRoom = rooms.find((r) => r.id === chatId);
                    setActiveChat(
                        foundRoom ? { kind: 'room', room: foundRoom } : null,
                    );
                })
                .catch(() => setActiveChat(null))
                .finally(() => setIsLoading(false));
        } else {
            fetchProfileById(chatId)
                .then((profile) => {
                    if (profile) {
                        setActiveChat({
                            kind: 'direct',
                            correspondent: profile,
                        });
                    } else {
                        setActiveChat(null);
                    }
                })
                .catch(() => setActiveChat(null))
                .finally(() => setIsLoading(false));
        }
    }, [chatId, isRoomType, navigate]);

    // Подписка на сообщения
    useEffect(() => {
        if (!chatId || !isUUID(chatId)) return;

        setMessages([]);
        let unsubscribe: (() => void) | undefined;

        if (isRoomType) {
            fetchRoomMessages(chatId)
                .then((roomMsgs: GroupChatMessage[]) => setMessages(roomMsgs))
                .catch(console.error);

            unsubscribe = subscribeToRoomMessages(
                chatId,
                (newMessage: GroupChatMessage) => {
                    setMessages((prev) => {
                        if (prev.some((msg) => msg.id === newMessage.id))
                            return prev;
                        return [...prev, newMessage];
                    });
                },
            );
        } else {
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
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [chatId, currentUserId, isRoomType]);

    // Отправка сообщения
    async function send() {
        const trimmedText = text.trim();
        if (!trimmedText || !activeChat) return;

        setText('');
        try {
            if (activeChat.kind === 'room') {
                await sendRoomMessage(
                    trimmedText,
                    currentUserId,
                    activeChat.room.id,
                );
            } else {
                await sendMessage(
                    trimmedText,
                    currentUserId,
                    activeChat.correspondent.id,
                );
            }
        } catch (error) {
            console.error('Не удалось отправить сообщение', error);
        }
    }

    const handleSelectUser = (profile: Profile) => {
        navigate(`/chat/direct/${profile.id}`);
    };

    const handleSelectRoom = (room: Room) => {
        navigate(`/chat/room/${room.id}`);
    };

    const chatTitle =
        activeChat?.kind === 'direct'
            ? activeChat.correspondent.email
            : activeChat?.kind === 'room'
              ? activeChat.room.room_name
              : '';

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background">
            <Sidebar
                currentActive={activeChat}
                onSelectUser={handleSelectUser}
                onSelectRoom={handleSelectRoom}
            />

            <main className="flex-1 flex h-full flex-col min-w-0 border-l">
                {isLoading ? (
                    // Экран загрузки
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-muted-foreground animate-pulse">
                            Загрузка чата...
                        </p>
                    </div>
                ) : !chatId ? (
                    // Экран заглушки, если чат еще не выбран в URL (например, просто перешли на /chat)
                    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
                        <p className="text-muted-foreground mb-4">
                            Выберите, кому написать, или войдите в комнату
                        </p>
                        <div className="w-full max-w-sm">
                            <SearchUsers onSelectReceiver={handleSelectUser} />
                        </div>
                    </div>
                ) : chatId && !isUUID(chatId) ? (
                    // Ошибка некорректного ID
                    <div className="flex flex-1 flex-col items-center justify-center p-4">
                        <p className="text-destructive font-medium mb-4">
                            Некорректный идентификатор чата.
                        </p>
                        <div className="w-full max-w-sm">
                            <SearchUsers onSelectReceiver={handleSelectUser} />
                        </div>
                    </div>
                ) : !activeChat ? (
                    // Ошибка: чат не найден в БД
                    <div className="flex flex-1 flex-col items-center justify-center p-4">
                        <p className="text-muted-foreground mb-4">
                            Чат не найден или был удален.
                        </p>
                        <div className="w-full max-w-sm">
                            <SearchUsers onSelectReceiver={handleSelectUser} />
                        </div>
                    </div>
                ) : (
                    // Активное окно открытого чата
                    <>
                        <ChatHeader
                            buttonText="Выйти"
                            chatName={chatTitle}
                            onClick={signOut}
                            kind={activeChat?.kind}
                            members={members}
                            onAddMember={addMember}
                        />

                        {activeChat?.kind === 'direct' && (
                            <div className="p-2 border-b">
                                <SearchUsers
                                    onSelectReceiver={handleSelectUser}
                                />
                            </div>
                        )}

                        <ChatArea messages={messages} />

                        <ChatFooter
                            buttonText="Отправить"
                            inputPlaceholder="Напишите сообщение..."
                            messageText={text}
                            onChange={(e) => setText(e.target.value)}
                            onClick={send}
                            onKeyDown={(e) => e.key === 'Enter' && send()}
                        />
                    </>
                )}
            </main>
        </div>
    );
}
