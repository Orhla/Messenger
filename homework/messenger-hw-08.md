# Домашнее задание 8 — Доводим рефакторинг до конца

Основа этого ДЗ — новая фича: E2E-шифрование сообщений в групповых чатах (раздел ниже). Перед ней нужно быстро закрыть хвосты от ДЗ 7 и урока (пункты 1–4). Они небольшие, после каждого приложение должно работать.

---

## 1. Проверить всё, что писали вживую на уроке

Пройди руками и убедись, что работает. Если что-то сломано, исправь или запиши в список багов.

- [ ] Миграция `20261012000000_messages_sender_profiles_fk.sql` применена, `fetchDirectMessages` больше не падает с `PGRST200`
- [ ] В личном чате у загруженных сообщений видна подпись-email отправителя, а не `Unknown`
- [ ] `ChatLayout` работает через `<Outlet />`, роуты вложены в один layout-роут (`App.tsx`)
- [ ] Переходы между чатами и комнатами работают, активная комната в `Sidebar` подсвечивается
- [ ] Создание комнаты → возврат в чат → новая комната появилась в списке
- [ ] Комната: добавить участника через `MembersPanel`, написать сообщение, перезагрузить страницу
- [ ] `SearchUsers`: запрос уходит один раз после паузы ввода, добавленные участники не показываются в выдаче
- [ ] `npx tsc -b` проходит

---

## 2. Блок 3 (только сообщения): отправка через слой данных

Получение сообщений уже идёт через единую модель `Message` и `message.mapper.ts`. Теперь то же для отправки.

Сейчас:
- `sendMessage` (`lib/messages.ts`) шифрует текст и пишет в БД, всё в одной функции;
- `sendRoomMessage` (`lib/roomMessages.ts`) пишет в БД;
- компоненты (`DirectChat`, `RoomChat`) вызывают эти функции напрямую и знают, что у direct и room разные способы отправки.

### Что сделать

1. Разведи ответственность так же, как для получения: в `lib/supabase/*` остаётся только запрос к Supabase, шифрование и выбор типа чата лежат выше.
2. Сделай единую точку входа для отправки по аналогии с `fetchMessages({ type: ... })`, чтобы `DirectChat` и `RoomChat` вызывали её одинаково и не импортировали разные функции из разных файлов.
3. Старые `lib/messages.ts` и `lib/roomMessages.ts` не должны содержать дублей того, что уже перенесено в `lib/supabase/*`. Удали закомментированный код и неиспользуемые функции.
4. Подписка (`subscribeToMessages`, `subscribeToRoomMessages`) сейчас отдаёт `ChatMessage` / `GroupChatMessage`, а состояние в компонентах уже `Message[]`, поэтому `tsc -b` падает в `DirectChat.tsx` и `RoomChat.tsx`. Приведи новые сообщения к `Message` перед `setMessages`.
5. Вынеси расшифровку из `fetchDirectMessages` в отдельную функцию (там уже стоит `todo`).

### Чек-лист

- [ ] Ни один компонент не импортирует `sendMessage` / `sendRoomMessage` из старых файлов напрямую
- [ ] Компоненты не знают, что именно шифруется и куда пишется
- [ ] В `lib/supabase/*` нет шифрования и логики отображения
- [ ] `setMessages` везде принимает только `Message`
- [ ] Отправка сообщения в direct и в комнате работает, у нового сообщения в комнате есть подпись

---

## 3. Блок 4 — Гигиена

Пункты из ДЗ 7, которые остались.

- [ ] **`console.log` с открытым текстом.** `grep -rn "console\.\(log\|warn\)" src` ничего не находит, кроме осознанных мест. Не забудь новые: `message.mapper.ts` (логирует расшифрованные сообщения), `supabase/messages.ts`, `ChatArea.tsx`, `crypto.ts`, `rooms.ts`, `auth.ts`
- [ ] **`'use client'`** удалён из всех файлов (это директива Next.js, у нас Vite)
- [ ] **ESLint запускается.** В `eslint.config.js` добавлен `import eslintConfigPrettier from 'eslint-config-prettier'`, `npx eslint src` отрабатывает. Исправь найденное или внеси остальное в список
- [ ] **Один хелпер `cn`.** Все файлы `components/ui/*` импортируют `cn` из `@/lib/utils`, а не из npm-пакета `cn`; лишний пакет убран из `package.json`
- [ ] **`tsc -b` без ошибок**, включая `ui/scroll-area.tsx` (неиспользуемый `React`)
- [ ] Проверь, что `ui/badge.tsx` и `ui/tabs.tsx` реально импортируются; неиспользуемые файлы удали

---

## 4. `ValidChat` для `DirectChat`

В `RoomChat` проверка id вынесена в `ValidChat` (`isUUID` и `useParams` живут там, а `RoomChat` получает готовый `chatId: string`). Сделай то же для `DirectChat`.

### Что сделать

1. `DirectChat` принимает `chatId: string` пропсом и больше не вызывает `useParams` и `isUUID`.
2. `ValidChat` сейчас жёстко рендерит `RoomChat`. Сделай его независимым от конкретного чата, чтобы один компонент проверял id для обоих роутов.
3. `isUUID` определён ровно в одном месте.
4. При невалидном id показывай `EmptyState`, а не голый `<p>`.
5. Обнови `App.tsx` под новую форму.

### Чек-лист

- [ ] В `DirectChat` нет `useParams` и `isUUID`
- [ ] `isUUID` в проекте один
- [ ] `ValidChat` не импортирует `RoomChat` или `DirectChat`
- [ ] `/chat/direct/not-a-uuid` и `/chat/room/not-a-uuid` показывают одну и ту же заглушку
- [ ] `/chat/direct/<uuid>` и `/chat/room/<uuid>` открываются как раньше
- [ ] `npx tsc -b` проходит

### Подсказки

- Задачи 2 и 4 связаны: после `ValidChat` для direct в `DirectChat` и `RoomChat` исчезнут проверки `!chatId`.
- В пунктах 1–4 не добавляй функциональность по ходу. Баги, которые найдёшь, записывай отдельным списком.

---

# Основное задание — E2E-шифрование в групповых чатах

Для приватных чатов шифрование уже есть: у каждого пользователя пара ключей, а между двумя людьми получается общий ключ, которого не знает сервер (`crypto.ts`, `chatKeyManager.ts`). Для комнаты такой общий ключ между двоими не подходит: участников может быть много. Поэтому делаем иначе.

## Идея простыми словами

- У комнаты **один общий ключ**. Его создаёт тот, кто создаёт комнату. Все сообщения комнаты шифруются этим ключом.
- Каждому участнику ключ комнаты присылает **тот, кто его пригласил**. Присылает не открытым, а в **конверте**: ключ комнаты зашифрован общим ключом этих двоих (тем самым, что уже используется в приватных чатах).
- Чтобы открыть конверт, участнику нужен **публичный ключ того, кто его прислал**, и свой приватный ключ. Из них получается общий ключ двоих, им конверт открывается, внутри ключ комнаты.
- Конверты лежат в БД. Сервер видит только зашифрованное. Отправителю и получателю не нужно быть онлайн одновременно: конверт кладут в БД, а получатель забирает его, когда зайдёт в комнату.
- Разные люди могут прислать тебе конверты (например, тебя пригласил один, а позже ещё кто-то перевыслал). Конверты будут разные, но внутри везде один и тот же ключ комнаты.

## Что не делаем (осознанные компромиссы)

- Удаление участника и смену ключа комнаты (ротацию). Если участника удалили, ключ остаётся прежним.
- Перешифровку истории.
- Новый участник видит всю историю комнаты, потому что получает тот же ключ.
- Проверку подлинности публичных ключей: доверяем тому, что лежит в `profiles.public_key`.

---

## Шаг 1. База данных

Одна новая таблица для конвертов и изменения в `room_messages`. Миграция одна, например `20261013000000_room_e2e.sql`.

```sql
create table public.room_keys (
  room_id     uuid not null references public.rooms(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  wrapped_by  uuid not null references public.profiles(id),
  wrapped_key text not null,
  iv          text not null,
  primary key (room_id, member_id)
);

alter table public.room_messages rename column text to ciphertext;
alter table public.room_messages add column iv text not null default '';
```

Что нужно доделать самому:

1. **RLS для `room_keys`.** Включи и напиши политики (стиль смотри в `20260930000000_rooms.sql`):
   - читать можно только **свой** конверт (`member_id = auth.uid()`);
   - записывать конверт можно, если ты `wrapped_by` и сам участник этой комнаты.
2. **Старые сообщения комнат** лежат открытым текстом, и расшифровать их нельзя. Решение: удалить их в той же миграции. Открытый текст рядом с шифртекстом в таблице держать нельзя.
3. Убери из дефолта `iv` значение `''`, когда старых строк не останется.

---

## Шаг 2. Типы

`lib/types.ts`:

```ts
export type DbRoomKeyRow = {
    room_id: string;
    member_id: string;
    wrapped_by: string;
    wrapped_key: string;
    iv: string;
};

export type DbRoomMessageRow = {
    id: string;
    room_id: string;
    sender_id: string;
    ciphertext: string;
    iv: string;
    created_at: string;
    profiles?: { email: string } | null;
};
```

`GroupChatMessage` больше не нужен: в БД нет открытого `text`.

---

## Шаг 3. Криптография

`lib/crypto.ts`, добавить:

```ts
export async function generateRoomKey(): Promise<CryptoKey>;

export async function exportRoomKey(key: CryptoKey): Promise<string>;

export async function importRoomKey(base64: string): Promise<CryptoKey>;

export async function wrapRoomKey(
    roomKey: CryptoKey,
    pairKey: CryptoKey,
): Promise<{ wrappedKey: string; iv: string }>;

export async function unwrapRoomKey(
    wrappedKey: string,
    iv: string,
    pairKey: CryptoKey,
): Promise<CryptoKey>;
```

Подсказки:

- «Общий ключ двоих» (`pairKey`) даёт уже готовая `getOrCreateChatKey(userId)`. Новый ключ придумывать не нужно.
- Сам конверт — это обычное шифрование того же `encryptText` / `decryptText`, только шифруется не сообщение, а байты ключа комнаты.
- Подумай, должен ли ключ комнаты быть `extractable`. Тот, кто приглашает следующего, должен суметь завернуть его в конверт ещё раз.
- Ключ комнаты нужен только для `encrypt` и `decrypt`.

---

## Шаг 4. Слой данных (Supabase, без логики)

`lib/supabase/roomKeys.ts`:

```ts
export async function insertRoomKeys(rows: DbRoomKeyRow[]): Promise<void>;

export async function fetchRoomKey(
    roomId: string,
    memberId: string,
): Promise<DbRoomKeyRow | null>;
```

`lib/supabase/roomMessages.ts` (поправить):

```ts
export async function fetchRoomMessages(roomId: string): Promise<DbRoomMessageRow[]>;

export async function insertRoomMessage(row: {
    room_id: string;
    sender_id: string;
    ciphertext: string;
    iv: string;
}): Promise<void>;

export function subscribeToRoomMessages(
    roomId: string,
    onMessage: (row: DbRoomMessageRow) => void,
): () => void;
```

В этом слое нет шифрования: он принимает и отдаёт строки БД как есть.

---

## Шаг 5. Менеджер ключей комнаты

`lib/roomKeyManager.ts`:

```ts
export async function createRoomKeys(
    roomId: string,
    creatorId: string,
    memberIds: string[],
): Promise<void>;

export async function shareRoomKey(
    roomId: string,
    currentUserId: string,
    newMemberId: string,
): Promise<void>;

export async function getRoomKey(
    roomId: string,
    currentUserId: string,
): Promise<CryptoKey>;
```

Подсказки:

- `getRoomKey` кэширует результат в памяти по `roomId`, как `keyCache` в `chatKeyManager.ts`. В `localStorage` и IndexedDB ключ комнаты не кладём.
- Для себя создатель тоже делает конверт, чтобы потом читать комнату через тот же `getRoomKey`.
- Что делать, если у участника нет `public_key`: он не может получить конверт. Решение для ДЗ: не добавляем такого участника и показываем понятную ошибку.

---

## Шаг 6. Сообщения комнаты

Приведи отправку и получение к единому слою (см. пункт 2 выше), добавив шифрование комнаты:

```ts
export async function encryptRoomMessage(
    text: string,
    roomKey: CryptoKey,
): Promise<{ ciphertext: string; iv: string }>;

export async function decryptRoomMessage(
    row: DbRoomMessageRow,
    roomKey: CryptoKey,
): Promise<string>;
```

и подключи их:

```ts
// отправка
const roomKey = await getRoomKey(roomId, currentUserId);
const { ciphertext, iv } = await encryptRoomMessage(text, roomKey);
await insertRoomMessage({ room_id: roomId, sender_id: currentUserId, ciphertext, iv });

// получение (история и realtime идут одним путём)
const roomKey = await getRoomKey(roomId, currentUserId);
const text = await decryptRoomMessage(row, roomKey);
```

Мэппер `toRoomMessage` принимает уже расшифрованный `text`, как `toDirectMessage`.

---

## Шаг 7. Подключение в UI

1. **Создание комнаты** (`NewRoom`): после `createRoom(...)` вызови `createRoomKeys(room.id, creatorId, memberIds)`. Продумай, что увидит пользователь, если комната создалась, а ключи нет.
2. **Добавление участника** (`RoomChat.handleAddMember`): сначала `addMember(...)`, затем `shareRoomKey(...)`. Продумай, что делать, если второй шаг упал.
3. **Подписка и история** в `RoomChat`: расшифровка идёт через `getRoomKey`. Ошибку расшифровки одного сообщения показывай как «Ошибка дешифрования», как в direct, не роняя весь чат.

---

## Чек-лист

- [ ] В БД `room_messages` нет колонки `text`, в таблице видны только `ciphertext` и `iv` (проверь в Supabase Studio)
- [ ] В `room_keys` у каждого участника комнаты есть ровно одна строка
- [ ] Пользователь без строки в `room_keys` не может прочитать чужой конверт (проверь RLS запросом от другого аккаунта)
- [ ] Две вкладки под разными пользователями: сообщения доходят и читаются в обе стороны, в том числе через realtime
- [ ] Новый участник, добавленный позже, открывает комнату и читает всю историю
- [ ] Участник без `public_key` не добавляется, пользователь видит понятную ошибку
- [ ] Ключ комнаты нигде не логируется и не попадает в `localStorage`
- [ ] В `lib/supabase/*` нет шифрования, в компонентах нет импортов из `crypto.ts`
- [ ] `npx tsc -b` проходит

## Вопросы, которые стоит обдумать

- Почему для конверта достаточно публичного ключа отправителя и своего приватного, а сам отправитель не должен быть онлайн?
- Что произойдёт, если два разных человека пришлют тебе конверты с разным содержимым? Как это обнаружить?
- Что видит сервер, а чего не видит? Что остаётся видно (кто с кем и когда пишет)?
- Что станет, если удалить участника комнаты и оставить ключ прежним? Какую часть этой проблемы закрыла бы смена ключа?
