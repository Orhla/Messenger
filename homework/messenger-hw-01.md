# Домашнее задание 1 — Живой чат

Supabase Realtime Broadcast. Никакой базы данных, никакой авторизации.  
Открываешь два браузера — общаешься в реальном времени.

---

## Что получится

- Поле ввода + кнопка отправить
- Список сообщений обновляется мгновенно у всех участников канала
- Сообщения эфемерные — закрыл вкладку, история исчезла
- Работает на разных компьютерах в одной сети и за её пределами

---

## Блок А — Проект и Supabase

### А1 — Новый React проект

```bash
npm create vite@latest messenger -- --template react-ts
cd messenger
npm install
npm install @supabase/supabase-js
```

### А2 — Supabase проект

1. Создай новый проект на [supabase.com](https://supabase.com)
2. Project Settings → API → скопируй `Project URL` и `anon public` ключ
3. Создай `.env` в корне проекта:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> Переменные окружения в Vite должны начинаться с `VITE_` — иначе они не попадут в браузер.

### А3 — Supabase клиент

Создай `src/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Блок Б — Чат

### Б1 — Типы

```ts
type Message = {
  id: string
  text: string
  author: string
  timestamp: number
}
```

### Б2 — Имя пользователя

Сгенерируй случайное имя при открытии приложения и сохрани в `localStorage` — чтобы при перезагрузке имя не менялось:

```ts
function getUsername(): string {
  const stored = localStorage.getItem("username")
  if (stored) return stored
  const name = "User_" + Math.random().toString(36).slice(2, 6)
  localStorage.setItem("username", name)
  return name
}
```

### Б3 — Канал

Supabase Realtime работает через **каналы**. Канал — это именованная шина событий. Все, кто подписан на один канал, получают одни и те же сообщения.

Сейчас используем **Broadcast** — самый простой режим. Сообщения не сохраняются в базе, они просто рассылаются всем подписчикам прямо сейчас. Что-то вроде WebSocket pub/sub.

```ts
const channel = supabase.channel("general")
```

### Б4 — Подписка и отправка

В `App.tsx`:

```tsx
import { useEffect, useRef, useState } from "react"
import { supabase } from "./supabase"

const USERNAME = getUsername()

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel("general")
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages(prev => [...prev, payload as Message])
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [])

  function send() {
    if (!text.trim() || !channelRef.current) return

    channelRef.current.send({
      type: "broadcast",
      event: "message",
      payload: {
        id: crypto.randomUUID(),
        text: text.trim(),
        author: USERNAME,
        timestamp: Date.now(),
      } satisfies Message,
    })

    setText("")
  }

  return (
    <div>
      <ul>
        {messages.map(m => (
          <li key={m.id}>
            <b>{m.author}</b>: {m.text}
          </li>
        ))}
      </ul>

      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === "Enter" && send()}
        placeholder="Сообщение..."
      />
      <button onClick={send}>Отправить</button>
    </div>
  )
}
```

> Обрати внимание: отправитель **не получает своё сообщение обратно** через Broadcast — это нормальное поведение по умолчанию. Если хочешь видеть свои сообщения сразу — добавь их в state до `channel.send()`.

---

## Блок В — Проверка

1. Запусти `npm run dev`
2. Открой `localhost:5173` в двух вкладках (или на двух компьютерах с одинаковым `.env`)
3. Отправь сообщение — оно должно появиться в обоих окнах мгновенно

Если сообщения не приходят — проверь в Supabase Dashboard → Realtime → вкладка Inspector: там видны все события в реальном времени.

---

## Что изучить самостоятельно

- Что такое `satisfies` в TypeScript и чем отличается от приведения типа `as`
- Почему `channelRef` а не просто переменная внутри `useEffect`
- Чем Broadcast отличается от Postgres Changes — второй режим будем использовать в следующем уроке

---

## Осознанные упрощения

- Нет авторизации — любой знающий ключ может войти
- Нет хранения сообщений — история исчезает при перезагрузке (это намеренно для первого урока)
- Нет обработки отключений и переподключений
- Один общий чат без комнат
