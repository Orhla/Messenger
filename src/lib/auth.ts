import { supabase } from '@/supabase';
import type { Session } from '@supabase/supabase-js';

export async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
}

export async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    console.log('Error', error);
    if (error) throw error;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_, session) =>
        callback(session),
    );
    return () => data.subscription.unsubscribe();
}
