import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/supabase';
import { getUsername } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const USERNAME = getUsername();

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('general')
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as Message]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  function send() {
    if (!text.trim() || !channelRef.current) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      text: text.trim(),
      author: USERNAME,
      timestamp: Date.now(),
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: newMessage,
    });

    setMessages((prev) => [...prev, newMessage]);

    setText('');
  }

  return (
    <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background">
      {/* Шапка чата */}
      <header className="p-4 border-b font-semibold text-center">
        # general
      </header>

      {/* Скроллируемая область сообщений */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((m) => {
            const isMe = m.author === USERNAME;

            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Имя автора (показываем только для чужих сообщений) */}
                {!isMe && (
                  <span className="text-xs text-muted-foreground mb-1 px-1">
                    {m.author}
                  </span>
                )}

                {/* Пузырь сообщения */}
                <div
                  className={`rounded-lg p-3 text-sm break-words ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-muted text-foreground rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Нижняя панель ввода */}
      <footer className="p-4 border-t flex gap-2 bg-background">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Напишите сообщение..."
          className="flex-1"
        />
        <Button onClick={send}>Отправить</Button>
      </footer>
    </div>
  );
}
