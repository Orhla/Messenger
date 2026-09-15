import { supabase } from '@/supabase';
import type { Message } from '@/lib/types';


export async function fetchMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at');

  if (error) throw error;
  return data;
}

export async function sendMessage(text: string, author: string): Promise<void> {
  const { error } = await supabase.from('messages').insert({ text, author });
  if (error) throw error;
}

export function subscribeToMessages(onMessage: (message: Message) => void): () => void {
  const channel = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      ({ new: message }) => onMessage(message as Message),
    )
    .subscribe();

  return () => channel.unsubscribe();
}
