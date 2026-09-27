'use client';

import {
    arrayBufferToBase64,
    exportPublicKey,
    generateKeyPair,
} from '@/lib/crypto';
import { loadPrivateKey, savePrivateKey } from '@/lib/keystore';
import { useEffect, useState } from 'react';
import { useToastManager } from '@/components/ui/toast';
import { Separator } from '@/components/ui/separator';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Download,
    KeyRound,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    User,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';

async function checkKeyExists(): Promise<boolean> {
    const key = await loadPrivateKey();
    return !!key;
}

export default function Settings() {
    const [hasKey, setHasKey] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const toastManager = useToastManager();
    const { session } = useAuth();
    const currentUserId = session!.user.id;

    useEffect(() => {
        checkKeyExists().then(setHasKey);
    }, []);

    async function handleGenerateKey() {
        if (!currentUserId) {
            toastManager.add({
                type: 'error',
                title: 'Ошибка',
                description:
                    'Сессия пользователя не найдена. Перезагрузите страницу.',
            });
            return;
        }

        if (hasKey) {
            const confirmGeneration = window.confirm(
                'Внимание! У вас уже есть сгенерированный ключ. ' +
                    'Создание нового ключа сделает нечитаемой всю вашу старую переписку, ' +
                    'так как расшифровать её сможет только старый ключ. Вы уверены?',
            );
            if (!confirmGeneration) return;
        }

        setLoading(true);
        try {
            const keyPair = await generateKeyPair();
            await savePrivateKey(keyPair.privateKey);

            const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);

            const { error } = await supabase
                .from('profiles')
                .update({ public_key: publicKeyBase64 })
                .eq('id', currentUserId);

            if (error) throw error;

            setHasKey(true);

            toastManager.add({
                type: 'success',
                title: 'Успешно',
                description: 'Новая пара ключей сгенерирована и сохранена.',
            });
        } catch (error) {
            console.error(error);
            toastManager.add({
                type: 'error',
                title: 'Ошибка',
                description: 'Не удалось сгенерировать ключи безопасности.',
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleDownloadKey() {
        try {
            const privateKey = await loadPrivateKey();
            if (!privateKey) {
                toastManager.add({
                    type: 'error',
                    title: 'Ключ не найден',
                    description: 'Сначала необходимо сгенерировать ключ.',
                });
                return;
            }

            const raw = await crypto.subtle.exportKey('pkcs8', privateKey);
            const base64String = arrayBufferToBase64(raw);

            const blob = new Blob([base64String], {
                type: 'text/plain;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'private_key.txt';

            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toastManager.add({
                type: 'success',
                title: 'Скачивание запущено',
                description: 'Файл приватного ключа успешно экспортирован.',
            });
        } catch (error) {
            console.error(error);
            toastManager.add({
                type: 'error',
                title: 'Ошибка',
                description: 'Не удалось экспортировать ключ.',
            });
        }
    }

    return (
        <div className="container max-w-lg mx-auto py-10 px-4 space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
                <p className="text-muted-foreground">
                    Управление аккаунтом и ключами шифрования.
                </p>
            </div>

            <Separator />

            {/* Заготовка: Изменение профиля */}
            <Card className="opacity-60 pointer-events-none">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <User className="h-5 w-5" /> Профиль
                    </CardTitle>
                    <CardDescription>
                        Изменение логина и пароля (в разработке).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Новый логин</Label>
                        <Input
                            id="username"
                            placeholder="Введите новый логин"
                            disabled
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Новый пароль</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            disabled
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button disabled>Сохранить изменения</Button>
                </CardFooter>
            </Card>

            {/* Безопасность и Ключи */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <KeyRound className="h-5 w-5" /> Безопасность
                    </CardTitle>
                    <CardDescription>
                        Управление сквозным (E2E) шифрованием ваших сообщений.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                        {hasKey ? (
                            <>
                                <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">
                                        Ключ безопасности активен
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Ваше устройство готово к шифрованию
                                        переписки.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <ShieldAlert className="h-6 w-6 text-destructive shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">
                                        Ключ отсутствует
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Вы не сможете читать и отправлять
                                        зашифрованные сообщения.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={handleGenerateKey}
                        disabled={loading}
                        variant={hasKey ? 'outline' : 'default'}
                        className="w-full sm:w-auto gap-2"
                    >
                        {loading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Сгенерировать ключ
                    </Button>

                    <Button
                        onClick={handleDownloadKey}
                        disabled={!hasKey}
                        variant="secondary"
                        className="w-full sm:w-auto gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Скачать ключ
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
