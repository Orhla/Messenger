'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/lib/types';
import {
    Message,
    MessageContent,
    MessageHeader,
} from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';

type Props = { messages: ChatMessage[]; author: string };

export default function ChatArea({ author, messages }: Props) {
    return (
        <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
                {messages.map((m) => {
                    const isMe = m.sender_id === author;

                    return (
                        <Message key={m.id} align={isMe ? 'end' : 'start'}>
                            <MessageContent>
                                {!isMe && (
                                    <MessageHeader className="text-xs text-muted-foreground mb-1 px-1">
                                        {author}
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
