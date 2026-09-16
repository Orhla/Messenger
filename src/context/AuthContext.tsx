import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '@/lib/auth';

type AuthContextValue = {
    session: Session | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
    session: null,
    loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSession().then((currentSession) => {
            setSession(currentSession);
            setLoading(false);
        });

        const unsubscribe = onAuthStateChange((currentSession) => {
            setSession(currentSession);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
