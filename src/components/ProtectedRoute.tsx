import { useAuth } from '@/context/AuthContext';
import type { ReactNode } from 'react';
import AuthForm from '@/components/AuthForm';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { session, loading } = useAuth();

    if (loading) return null;
    if (!session) {
        return <AuthForm />;
    }

    return <>{children}</>;
}
