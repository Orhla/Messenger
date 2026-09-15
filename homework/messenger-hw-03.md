# Домашнее задание 3 — Авторизация, RLS и 1:1 чат

Цель: тонкий `App.tsx`, сессия в контексте, роутинг, сообщения привязаны к пользователям, RLS защищает данные, можно найти собеседника и написать ему лично.

---

## Блок А — Миграции

### А1 — Новая схема сообщений

`author text` уходит. Вместо него — честные UUID из Supabase Auth.

Создай файл `supabase/migrations/20260914000001_messages_with_users.sql`:

```sql
alter table messages
  drop column author,
  add column sender_id uuid not null references auth.users(id),
  add column receiver_id uuid not null references auth.users(id);
```

`sender_id` — кто отправил. `receiver_id` — кому. Оба обязательны: в этом приложении нет публичного чата, только личные сообщения.

### А2 — Таблица профилей

`auth.users` — системная таблица Supabase, клиентский JS её не видит. Чтобы показывать список пользователей в UI, нужна своя таблица в `public` схеме.

Добавь в тот же файл:

```sql
create table profiles (
  id   uuid primary key references auth.users(id) on delete cascade,
  email text not null
);
```

### А3 — Триггер: автозаполнение профиля

Без триггера пришлось бы вручную вызывать `INSERT INTO profiles` после каждой регистрации. Это ненадёжно — легко забыть, легко сломать.

Триггер — это функция в Postgres, которая запускается автоматически при определённом событии. Здесь: каждый раз когда в `auth.users` появляется новая строка (новый пользователь зарегистрировался), триггер сам кладёт запись в `profiles`.

```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

`security definer` — функция выполняется с правами её создателя (postgres), а не вызывающего. Это нужно потому что у обычного пользователя нет прав читать `auth.users`.

### А4 — RLS

Row Level Security — политики прямо в Postgres, которые определяют что конкретный пользователь может читать и писать. Без RLS любой авторизованный юзер видит чужие сообщения.

Создай файл `supabase/migrations/20260914000002_rls.sql`:

```sql
-- Профили: читать может любой авторизованный (нужно для поиска собеседника)
alter table profiles enable row level security;

create policy "profiles: authenticated can read"
  on profiles for select
  to authenticated
  using (true);

-- Сообщения: видишь только свои переписки
alter table messages enable row level security;

create policy "messages: read own"
  on messages for select
  using (
    sender_id = auth.uid() or receiver_id = auth.uid()
  );

create policy "messages: insert as self"
  on messages for insert
  with check (sender_id = auth.uid());
```

`auth.uid()` — встроенная функция Supabase, возвращает UUID текущего авторизованного пользователя. Если не авторизован — возвращает `null`, политика не пропускает.

Применить миграции:
```bash
npx supabase db push
```

---

## Блок Б — Рефакторинг

### Б1 — Установи React Router

```bash
npm install react-router-dom
```

### Б2 — AuthContext

Сейчас подписка на сессию живёт прямо в `App.tsx`. Как только появляется роутинг и несколько страниц — каждому компоненту, которому нужна сессия, придётся заново подписываться. Контекст решает это: подписка одна, доступ отовсюду через хук.

Создай `src/context/AuthContext.tsx`. Вот скелет — заполни пропуски:

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSession, onAuthStateChange } from '@/lib/auth'

type AuthContextValue = {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>(/* ??? */)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Получи текущую сессию через getSession(), положи в state
    // 2. Не забудь поставить loading в false после получения сессии
    // 3. Подпишись на onAuthStateChange — при каждом изменении обновляй session
    // 4. Верни unsubscribe как cleanup
    /* ??? */
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

### Б3 — ProtectedRoute

Компонент-обёртка: если сессии нет — редиректит на `/login`, иначе рендерит дочерний компонент.

```tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return /* ??? */

  return <>{children}</>
}
```

### Б4 — Тонкий App.tsx

После рефакторинга `App.tsx` должен выглядеть примерно так:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import AuthForm from '@/components/AuthForm'
import Chat from '@/components/Chat'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={/* ??? */} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {/* ??? */}
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

### Б5 — Chat.tsx

Вынеси всю логику чата из `App.tsx` в `src/components/Chat.tsx`. Сессию бери через `useAuth()`, не через пропсы.

### Б6 — Обновить messages.ts

`sendMessage` больше не принимает `author` — `sender_id` берётся из сессии на сервере через RLS. Обнови сигнатуру:

```ts
export async function sendMessage(text: string, receiverId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({ text, receiver_id: receiverId })
  if (error) throw error
}
```

`sender_id` не передаём явно — Supabase проверит через `with check (sender_id = auth.uid())` и подставит автоматически если JWT в запросе валидный. Попытка подделать `sender_id` заблокируется политикой.

---

## Блок В — Поиск собеседника и 1:1 чат

### В1 — Поиск пользователей

Добавь в `src/lib/profiles.ts`:

```ts
import { supabase } from '@/supabase'
import type { Profile } from '@/lib/types'

export async function searchProfiles(query: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', `%${query}%`)
    .limit(10)

  if (error) throw error
  return data
}
```

Добавь тип `Profile` в `src/lib/types.ts`:

```ts
export type Profile = {
  id: string
  email: string
}
```

### В2 — UI поиска

В `Chat.tsx` добавь состояние выбранного собеседника:

```tsx
const [receiver, setReceiver] = useState<Profile | null>(null)
const [searchQuery, setSearchQuery] = useState('')
const [searchResults, setSearchResults] = useState<Profile[]>([])
```

При вводе в поиск — запрашиваем профили:

```tsx
useEffect(() => {
  if (!searchQuery.trim()) {
    setSearchResults([])
    return
  }
  searchProfiles(searchQuery).then(setSearchResults)
}, [searchQuery])
```

### В3 — Загрузка сообщений для конкретной переписки

Обнови `fetchMessages` в `messages.ts` — принимает `receiverId`:

```ts
export async function fetchMessages(receiverId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`receiver_id.eq.${receiverId},sender_id.eq.${receiverId}`)
    .order('created_at')

  if (error) throw error
  return data
}
```

RLS уже фильтрует по `auth.uid()` — так что этот запрос вернёт только сообщения между тобой и `receiverId`.

### В4 — Подписка только на нужные сообщения

Обнови `subscribeToMessages` в `messages.ts`:

```ts
export function subscribeToMessages(
  receiverId: string,
  onMessage: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`chat-${receiverId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      ({ new: message }) => {
        const m = message as Message
        if (m.sender_id === receiverId || m.receiver_id === receiverId) {
          onMessage(m)
        }
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}
```

---

## Что изучить самостоятельно

- Чем `createContext` без дефолтного значения отличается от `createContext(null)` — и почему второй вариант часто хуже
- Что такое `security definer` в Postgres функциях и почему без него триггер не сработает
- Почему `sender_id` не нужно передавать в `insert` — и как Supabase это проверяет
