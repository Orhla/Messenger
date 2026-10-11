'use client';

import { useEffect, useState } from 'react';
import type { ChatMessage, GroupChatMessage, Profile, Room } from '@/lib/types';
import { signOut } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { addMember, getRoomMembers, getRooms } from '@/lib/rooms';
import {
    fetchRoomMessages,
    sendRoomMessage,
    subscribeToRoomMessages,
} from '@/lib/roomMessages';
import EmptyState from '@/components/EmptyState';
import MembersPanel from '@/components/MembersPanel';
import ChatView from '@/components/ChatView';

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(value: string) {
    return typeof value === 'string' && UUID_REGEX.test(value);
}

export default function RoomChat() {
    const { chatId } = useParams<{ chatId: string }>();

    const [messages, setMessages] = useState<
        (ChatMessage | GroupChatMessage)[]
    >([]);
    const [activeChat, setActiveChat] = useState<Room | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [members, setMembers] = useState<Profile[]>([]);
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    useEffect(() => {
        if (!chatId || !isUUID(chatId)) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        Promise.all([
            getRooms().then((rooms) => rooms.find((r) => r.id === chatId)),
            getRoomMembers(chatId).catch(() => []),
        ])
            .then(([foundRoom, roomMembers]) => {
                if (foundRoom) {
                    setActiveChat(foundRoom);
                    setMembers(roomMembers);
                } else {
                    setActiveChat(null);
                    setMembers([]);
                }
            })
            .catch(() => {
                setActiveChat(null);
                setMembers([]);
            })
            .finally(() => setIsLoading(false));
    }, [chatId]);

    useEffect(() => {
        if (!chatId || !isUUID(chatId)) return;

        setMessages([]);
        let unsubscribe: (() => void) | undefined;

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

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [chatId, currentUserId]);

    const handleAddMember = async (profile: Profile) => {
        if (!chatId) return;

        try {
            await addMember(chatId, profile.id);

            setMembers((prev) => {
                if (prev.some((m) => m.id === profile.id)) return prev;
                return [...prev, profile];
            });
        } catch (error) {
            console.error('Не удалось добавить участника в комнату:', error);
        }
    };

    async function send(messageText: string) {
        if (!activeChat) return;
        try {
            await sendRoomMessage(messageText, currentUserId, activeChat.id);
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
            chatTitle={activeChat.room_name}
            messages={messages}
            onSend={send}
            onSignOut={signOut}
        >
            <MembersPanel members={members} onAddMember={handleAddMember} />
        </ChatView>
    );
}
