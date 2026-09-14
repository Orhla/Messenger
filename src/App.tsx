import { useEffect, useState } from 'react';
import { getUsername } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { fetchMessages, sendMessage, subscribeToMessages } from '@/lib/messages';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const USERNAME = getUsername();

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    fetchMessages().then(setMessages);

    const unsubscribe = subscribeToMessages((message) => {
      setMessages((prev) => [...prev, message]);
    });

    return unsubscribe;
  }, []);

  async function send() {
    if (!text.trim()) return;
    // todo: добавить обработку ошибок, статус загрузки и т.д.
    setText('');
    await sendMessage(text.trim(), USERNAME);
  }

  // app.tsx обычно делают тонким. Верстку тут делать не надо.
  // да даже и для чата я бы сделал отдельный компонент. Т.к. если будем добавлять роуты будет больно выгрызать это из апп файла
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
