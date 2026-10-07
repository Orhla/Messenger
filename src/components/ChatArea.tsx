'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage, GroupChatMessage } from '@/lib/types';
import {
    Message,
    MessageContent,
    MessageHeader,
} from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { useAuth } from '@/context/AuthContext.tsx';
import { MessageSquareDashed } from 'lucide-react';

type Props = { messages: (ChatMessage | GroupChatMessage)[] };

export default function ChatArea({ messages }: Props) {
    console.log('ChatArea messages:', messages);
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    // СОСТОЯНИЕ 2: Собеседник выбран, но переписка пустая
    if (messages.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-background">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                    <MessageSquareDashed className="h-8 w-8 stroke-[1.5] animate-pulse" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                    Пустой чат
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
                    Здесь пока нет сообщений. Напишите что-нибудь первым, чтобы
                    начать диалог!
                </p>
            </div>
        );
    }

    // СОСТОЯНИЕ 3: Собеседник выбран, переписка не пустая
    return (
        <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
                {messages.map((m) => {
                    const isMe = m.sender_id === currentUserId;

                    return (
                        <Message key={m.id} align={isMe ? 'end' : 'start'}>
                            <MessageContent>
                                {!isMe && (
                                    <MessageHeader className="text-xs text-muted-foreground mb-1 px-1 font-medium">
                                        {'profiles' in m && m.profiles ? (
                                            <span className="text-primary">
                                                {m.profiles.email}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/80">
                                                {m.sender_id}
                                            </span>
                                        )}
                                    </MessageHeader>
                                )}

                                <Bubble variant={isMe ? 'default' : 'muted'}>
                                    <BubbleContent className="text-sm break-words">
                                        {m.text}
                                    </BubbleContent>
                                </Bubble>
                            </MessageContent>
                        </Message>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
