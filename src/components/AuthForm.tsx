import { useState } from 'react';
import { signIn, signUp } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function AuthForm() {
    const [isSignUp, setIsSignUp] = useState<boolean>(false);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    async function submit() {
        if (isLoading) return;

        setError('');
        setIsLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password);
            } else {
                await signIn(email, password);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Что-то пошло не так');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="w-80 space-y-4">
                <h1 className="text-xl font-semibold text-center">
                    {isSignUp ? 'Регистрация' : 'Вход'}
                </h1>

                <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    disabled={isLoading}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    disabled={isLoading}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                />

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                    className="w-full"
                    onClick={submit}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Пожалуйста, подождите
                        </>
                    ) : isSignUp ? (
                        'Зарегистрироваться'
                    ) : (
                        'Войти'
                    )}
                </Button>

                <button
                    className="w-full text-sm text-muted-foreground hover:underline"
                    disabled={isLoading}
                    onClick={() => setIsSignUp((v) => !v)}
                >
                    {isSignUp
                        ? 'Уже есть аккаунт? Войти'
                        : 'Нет аккаунта? Зарегистрироваться'}
                </button>
            </div>
        </div>
    );
}
