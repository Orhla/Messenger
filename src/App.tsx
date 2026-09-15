import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Message } from '@/lib/types';
import { fetchMessages, sendMessage, subscribeToMessages } from '@/lib/messages';
import { getSession, onAuthStateChange, signOut } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    getSession().then((session) => {
      console.log("Setting session", session)
      setSession(session)
    });
    const unsubscribe = onAuthStateChange(setSession);
    return unsubscribe
  }, []);

  useEffect(() => {
    if (!session) return;

    fetchMessages().then(setMessages);

    const unsubscribe = subscribeToMessages((message) => {
      setMessages((prev) => [...prev, message]);
    });

    return unsubscribe;
  }, [session]);

  if (!session) return <AuthForm />;

  const author = session.user.email!;

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    await sendMessage(trimmed, author);
  }

  // app.tsx обычно делают тонким. Верстку тут делать не надо.
  // да даже и для чата я бы сделал отдельный компонент. Т.к. если будем добавлять роуты будет больно выгрызать это из апп файла
  return (
    <div className="flex h-screen flex-col max-w-md mx-auto border-x bg-background">
      <header className="p-4 border-b flex items-center justify-between">
        <span className="font-semibold"># general</span>
        <button
          className="text-sm text-muted-foreground hover:underline"
          onClick={signOut}
        >
          Выйти
        </button>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((m) => {
            const isMe = m.author === author;

            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {!isMe && (
                  <span className="text-xs text-muted-foreground mb-1 px-1">
                    {m.author}
                  </span>
                )}
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
