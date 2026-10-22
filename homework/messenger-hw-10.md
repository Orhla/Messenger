# Домашнее задание 10 — Аудиозвонки через WebRTC

ёЭто задание про новую для тебя технологию: WebRTC — стандарт браузера, позволяющий двум вкладкам передавать аудио напрямую друг другу, минуя сервер. Мы добавим аудиозвонки в личные чаты. Звонить в комнаты не будем.

Задание сложнее предыдущих, потому что:
- Ты работаешь с асинхронным протоколом, у которого есть порядок шагов. Пропустить или перепутать шаг — и соединения не будет.
- Браузерное API большое и непривычное.
- Тебе нужно держать в голове сразу двух участников и то, что происходит у каждого.

Читай объяснения внимательно. Гугли MDN RTCPeerConnection — там хорошая документация. Задавай вопросы.

---

## Как работает WebRTC: концепция

Представь, что вы с другом хотите поговорить по телефону, но ни один из вас не знает номер другого. Нужен посредник, чтобы обменяться «адресами». После обмена посредник уже не нужен — вы говорите напрямую.

В WebRTC:

- **RTCPeerConnection** — это «телефон» внутри браузера. Он умеет кодировать аудио (кодек Opus), шифровать (DTLS/SRTP), и отправлять пакеты напрямую собеседнику.
- **Signaling** (сигналинг) — обмен «адресами» через посредника. В нашем случае посредник — Supabase Realtime. После того, как адреса обменяны, Supabase больше не участвует.
- **SDP** (Session Description Protocol) — большой текстовый блоб с описанием: какие кодеки поддерживаю, какой порт слушаю, какие криптоалгоритмы. Caller генерирует offer-SDP, Callee отвечает answer-SDP.
- **ICE candidate** — конкретный сетевой адрес, через который можно достучаться до браузера (локальный IP, публичный IP через STUN, relay через TURN). Браузер сам находит их и выдаёт тебе по одному по мере обнаружения.
- **STUN-сервер** — маленький сервис, который отвечает: «твой публичный IP — такой-то». Нужен, чтобы за NAT-ом люди могли найти друг друга. Мы используем бесплатный от Google: `stun:stun.l.google.com:19302`.

### Порядок шагов (критично не перепутать)

```
Caller (ты нажал "Позвонить")          Supabase          Callee (тебе звонят)
                                          
1. getUserMedia() → получить микрофон
2. new RTCPeerConnection(config)
3. addTrack(audioTrack)
4. createOffer() → SDP offer
5. setLocalDescription(offer)
6. ──── broadcast { type: 'offer', sdp } ──────────────►
                                                        7. new RTCPeerConnection(config)
                                                        8. getUserMedia() → микрофон
                                                        9. addTrack(audioTrack)
                                                       10. setRemoteDescription(offer)
                                                       11. createAnswer() → SDP answer
                                                       12. setLocalDescription(answer)
                                          ◄──── broadcast { type: 'answer', sdp } ────
13. setRemoteDescription(answer)

  ◄──── ICE candidates (обе стороны одновременно) ────►
  
14. Когда ICE готов — P2P аудио идёт напрямую!
```

**Важно:** ICE candidates начинают генерироваться сразу после `setLocalDescription`. Они могут прийти собеседнику ещё до того, как у него установлен `remoteDescription`. В этом случае надо их буферизировать и применить позже. Подробнее — в разделе «Особые случаи».

---

## Observability (обязательно)

Это задание про протокол, который не видно глазами. Поэтому мы делаем его видимым двумя способами.

### 1. Консоль браузера

Каждое взаимодействие с Supabase и каждое событие RTCPeerConnection логируется с префиксом. Открой DevTools → Console — ты должен видеть весь поток событий:

```
[Signaling] Подписываемся на канал: call:abc123_def456
[Signaling] Канал подключён
[WebRTC] Запрашиваем микрофон...
[WebRTC] Микрофон получен
[WebRTC] Создаём RTCPeerConnection
[WebRTC] Создаём offer...
[WebRTC] setLocalDescription (offer) применён
[Signaling] Отправляем сигнал: offer  { sdpLength: 1423 }
[Signaling] Получен сигнал: offer  от abc123
[WebRTC] setRemoteDescription (offer) применён
[WebRTC] Создаём answer...
[WebRTC] setLocalDescription (answer) применён
[Signaling] Отправляем сигнал: answer  { sdpLength: 1198 }
[WebRTC] ICE candidate найден: candidate:2113667327 1 udp ...
[Signaling] Отправляем сигнал: ice-candidate
[Signaling] Получен сигнал: ice-candidate  от abc123
[WebRTC] addIceCandidate применён
[WebRTC] iceConnectionState: checking
[WebRTC] iceConnectionState: connected  ← ЗВОНОК АКТИВЕН
[Signaling] Получен сигнал: call-end  от abc123
[WebRTC] Закрываем соединение и треки
[Signaling] Отписываемся от канала: call:abc123_def456
```

### 2. Системные сообщения в чате

Кроме консоли, ключевые события появляются прямо в области чата как серые «системные» сообщения — не в БД, только локально. Это даёт живую картину для обоих участников.

Что должно появляться у Caller:
```
──── 📡 Вы инициируете звонок... ────
──── 📡 Offer отправлен (SDP: 1423 байта) ────
──── 📡 Получен answer от собеседника ────
──── 📡 ICE: проверяем маршруты... ────
──── 📡 Соединение установлено ────
──── 📞 Звонок завершён (00:42) ────
```

Что должно появляться у Callee:
```
──── 📡 Входящий звонок... ────
──── 📡 Вы приняли звонок, answer отправлен ────
──── 📡 ICE: проверяем маршруты... ────
──── 📡 Соединение установлено ────
```

---

## Файлы, которые нужно создать или изменить

| Файл | Новый / Изменить | Что делает |
|------|-----------------|------------|
| `src/lib/types.ts` | Изменить | Добавить `SystemMessage`, `CallState`, `CallSignal` |
| `src/lib/supabase/signaling.ts` | Новый | Broadcast/subscribe через Supabase Realtime |
| `src/hooks/useWebRTC.ts` | Новый | RTCPeerConnection, медиастримы, state машина |
| `src/components/CallOverlay.tsx` | Новый | UI: входящий звонок + активный звонок |
| `src/components/ChatArea.tsx` | Изменить | Рендерить `SystemMessage` иначе |
| `src/components/ChatHeader.tsx` | Изменить | Кнопка звонка |
| `src/components/DirectChat.tsx` | Изменить | Интегрировать `useWebRTC`, системные сообщения |

---

## Шаг 1. Типы (`lib/types.ts`)

Добавь к существующим типам:

```ts
// Системное сообщение — только локальное, не хранится в БД
export type SystemMessage = {
    id: string;           // генерируй через crypto.randomUUID()
    type: 'system';
    text: string;
    created_at: string;
};

// Расширь существующий тип Message
export type Message = DirectMessage | RoomMessage | SystemMessage;

// Состояния звонка
export type CallState =
    | { status: 'idle' }
    | { status: 'calling'; peerId: string }
    | { status: 'ringing'; peerId: string; offer: RTCSessionDescriptionInit }
    | { status: 'connecting'; peerId: string }
    | { status: 'connected'; peerId: string; startedAt: number };

// Сигналы, которые летят через Supabase
export type CallSignal =
    | { type: 'offer';         sdp: RTCSessionDescriptionInit; from: string }
    | { type: 'answer';        sdp: RTCSessionDescriptionInit; from: string }
    | { type: 'ice-candidate'; candidate: RTCIceCandidateInit; from: string }
    | { type: 'call-end';      from: string }
    | { type: 'call-reject';   from: string };
```

Подсказки:
- `CallState` — дискриминированный union. Когда ты пишешь `if (call.status === 'connected')`, TypeScript автоматически знает, что `call.startedAt` доступен.
- `RTCSessionDescriptionInit` и `RTCIceCandidateInit` — встроенные типы браузера, импортировать не нужно.
- `SystemMessage` не проходит через маппер. Создавай прямо в `DirectChat` и добавляй в `messages` через `setMessages`.

---

## Шаг 2. Слой сигналинга (`lib/supabase/signaling.ts`)

Этот файл только отправляет и получает сигналы через Supabase Realtime. Никакой логики WebRTC здесь нет.

```ts
// Детерминированный ID канала независимо от порядка аргументов.
// Например: 'call:' + [userA, userB].sort().join('_')
export function getCallChannelId(userA: string, userB: string): string;

// Создаёт Supabase channel, подписывается на broadcast-событие 'signal'.
// Возвращает функцию отписки.
export function subscribeToCallSignals(
    channelId: string,
    onSignal: (signal: CallSignal) => void,
): () => void;

// Отправляет сигнал в канал.
export async function broadcastCallSignal(
    channelId: string,
    signal: CallSignal,
): Promise<void>;
```

Подсказки:
- Supabase Realtime channel: `supabase.channel(channelId)`.
- Подписка на broadcast: `channel.on('broadcast', { event: 'signal' }, handler).subscribe()`.
- Отправка: `channel.send({ type: 'broadcast', event: 'signal', payload: signal })`.
- Канал нужно создать **один раз** и переиспользовать для отправки и получения. Если создать два — они не увидят друг друга.
- **Логируй всё** с префиксом `[Signaling]`: подписку, статус канала, каждый отправленный и полученный сигнал.

---

## Шаг 3. Хук `useWebRTC` (`hooks/useWebRTC.ts`)

Это самый сложный файл. Он управляет `RTCPeerConnection` и состоянием звонка.

```ts
type UseWebRTCOptions = {
    currentUserId: string;
    peerId: string;
    onSystemMessage: (text: string) => void;
};

type UseWebRTCResult = {
    callState: CallState;
    startCall: () => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    hangUp: () => void;
};

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCResult;
```

### Что держать в хуке

```ts
const [callState, setCallState] = useState<CallState>({ status: 'idle' });

// RTCPeerConnection живёт в ref, а не в state — он мутируется
const pcRef = useRef<RTCPeerConnection | null>(null);

// ICE candidates, пришедшие раньше remoteDescription (см. "Особые случаи")
const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
```

### Вспомогательная функция: `createPeerConnection`

Создание `RTCPeerConnection` вынеси в отдельную функцию, чтобы не дублировать (её вызывают и `startCall`, и `acceptCall`).

При создании нужно сразу навесить три колбэка:
- `onicecandidate` — когда браузер нашёл новый ICE candidate, отправь его через `broadcastCallSignal`. Логируй первые ~60 символов строки кандидата.
- `oniceconnectionstatechange` — логируй каждое состояние. Когда стало `connected` или `completed` — переводи `callState` в `{ status: 'connected', ... }` и вызывай `onSystemMessage`.
- `ontrack` — пришёл удалённый аудиострим. Воспроизведи его: создай `new Audio()`, присвой `audio.srcObject = event.streams[0]`, вызови `audio.play()`.

### `startCall`

Шаги по порядку — не пропускай и не меняй:
1. Вызови `onSystemMessage`, залогируй `[WebRTC] Запрашиваем микрофон...`
2. `navigator.mediaDevices.getUserMedia({ audio: true })`
3. `createPeerConnection()`, добавь треки из стрима через `addTrack`
4. `createOffer()`, затем `setLocalDescription(offer)`
5. `broadcastCallSignal` с `{ type: 'offer', sdp: offer, from: currentUserId }` — логируй длину SDP
6. `setCallState({ status: 'calling', peerId })`

### `handleIncomingSignal`

Центральная функция хука — обрабатывает все входящие сигналы. Подключается через `subscribeToCallSignals` в `useEffect` при монтировании.

```ts
async function handleIncomingSignal(signal: CallSignal) {
    // Всегда игнорируй собственные сигналы — Supabase broadcast возвращает их тебе тоже
    if (signal.from === currentUserId) return;

    switch (signal.type) {
        case 'offer':
            // Сохрани offer в state — он понадобится в acceptCall
            onSystemMessage('📡 Входящий звонок...');
            setCallState({ status: 'ringing', peerId: signal.from, offer: signal.sdp });
            break;

        case 'answer':
            // setRemoteDescription(answer), затем применить буфер ICE candidates
            // onSystemMessage, setCallState → 'connecting'
            break;

        case 'ice-candidate':
            // Если remoteDescription ещё не установлен — буферизируй
            // Иначе — addIceCandidate сразу
            break;

        case 'call-end':
        case 'call-reject':
            cleanup();
            break;
    }
}
```

### `acceptCall`

Вызывается, когда пользователь нажимает «Принять». Offer уже лежит в `callState.offer`.

Шаги зеркальны `startCall`, но с другой стороны: сначала `setRemoteDescription(offer)`, затем `createAnswer()` и `setLocalDescription(answer)`, затем `broadcastCallSignal` с `{ type: 'answer', ... }`. Не забудь применить буфер ICE candidates после `setRemoteDescription`.

### `cleanup`

Вызывается при любом завершении или отклонении. Не забудь:
- остановить все треки через `getSenders().forEach(s => s.track?.stop())` — иначе индикатор микрофона в браузере не погаснет
- закрыть `pc.close()`
- очистить `iceCandidateQueueRef`
- `setCallState({ status: 'idle' })`

### `hangUp` и `rejectCall`

Перед `cleanup()`: отправь `broadcastCallSignal({ type: 'call-end' })`. Для `hangUp` посчитай длительность из `callState.startedAt` и добавь в системное сообщение.

---

## Шаг 4. UI звонка (`components/CallOverlay.tsx`)

```ts
type Props = {
    callState: CallState;
    peerEmail: string;
    onAccept: () => void;
    onReject: () => void;
    onHangUp: () => void;
};
```

Компонент рендерит `null` когда `callState.status === 'idle'`. В остальных случаях — плавающая карточка (фиксированная позиция, поверх чата).

Три режима верстки:
- **`ringing`** — показывай email собеседника, кнопки «Принять» и «Отклонить»
- **`calling` / `connecting`** — текущий статус («Вызов...» / «Соединение...»), кнопка «Отменить»
- **`connected`** — статус «Звонок активен», таймер, кнопка «Завершить»

`CallTimer` — отдельный дочерний компонент с пропсом `startedAt: number`. Показывает формат `MM:SS` и обновляется каждую секунду через `useEffect` + `setInterval`. Не забудь очистить интервал при размонтировании.

---

## Шаг 5. Системные сообщения в `ChatArea`

В списке сообщений `SystemMessage` (где `msg.type === 'system'`) нужно рендерить иначе, чем обычное сообщение — по центру экрана, без аватара, маленьким серым текстом. Что-то вроде «таблетки» посреди чата. Верстку придумай сама.

---

## Шаг 6. Интеграция в `DirectChat`

В `DirectChat` нужна функция `addSystemMessage`, которая создаёт объект типа `SystemMessage` и добавляет его в `messages`:

```ts
function addSystemMessage(text: string) {
    setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'system' as const,
        text,
        created_at: new Date().toISOString(),
    }]);
}
```

Хук подключается так:

```ts
const { callState, startCall, acceptCall, rejectCall, hangUp } = useWebRTC({
    currentUserId,
    peerId: chatId,
    onSystemMessage: addSystemMessage,
});
```

Кнопку «Позвонить» добавь в `ChatHeader` через `children` (он уже это поддерживает). Кнопка видна только когда `callState.status === 'idle'`.

`CallOverlay` рендерь рядом с `ChatView` и передавай ему нужные пропсы.

---

## Особые случаи (не пропускай)

### Буфер ICE candidates

Самая частая ошибка при реализации WebRTC — применять ICE candidates до того, как установлен `remoteDescription`. Браузер выбросит `Cannot add ICE candidate: Failed to set remote offer sdp`.

ICE candidates начинают приходить сразу после `setLocalDescription`. Но у принимающей стороны `setRemoteDescription` ещё не вызван — offer ещё не обработан. Поэтому в `handleIncomingSignal` для `ice-candidate` нужна проверка: если `pc.remoteDescription === null` — клади в `iceCandidateQueueRef`. После `setRemoteDescription` (и в `case 'answer'`, и в `acceptCall`) — проходись по очереди и применяй всех, затем очищай.

### Cleanup при размонтировании

Если пользователь переключается на другой чат во время звонка — `DirectChat` размонтируется. `useWebRTC` должен это поймать и закрыть соединение. Используй `useEffect` с пустым массивом зависимостей и возвращай функцию очистки.

### Отказ в доступе к микрофону

`getUserMedia` бросает `NotAllowedError`. Поймай его, покажи понятную ошибку пользователю.

---

## Чек-лист

### Observability
- [ ] В консоли видны логи `[Signaling]` и `[WebRTC]` для каждого шага протокола
- [ ] Виден каждый переход `iceConnectionState`
- [ ] Видно, когда ICE candidate буферизируется
- [ ] В чате появляются системные сообщения у обоих участников

### Звонок
- [ ] Caller нажимает «Позвонить», Callee видит входящий звонок
- [ ] Callee принимает — оба слышат друг друга
- [ ] Callee отклоняет — Caller получает сигнал, overlay исчезает
- [ ] Любая сторона завершает — звонок заканчивается у обоих
- [ ] Таймер считает секунды, длительность видна в финальном системном сообщении

### Корректность
- [ ] Переключение на другой чат во время звонка закрывает соединение
- [ ] Отказ в доступе к микрофону — понятная ошибка, не краш
- [ ] Индикатор микрофона в браузере гаснет после завершения звонка
- [ ] `npx tsc -b` проходит
- [ ] `removeChannel` вызывается при отписке, треки останавливаются в `cleanup`

---

## Вопросы, которые стоит обдумать

- Почему WebRTC называется peer-to-peer, если нам всё равно нужен Supabase для сигналинга?
- Что будет, если у одного из участников корпоративный firewall блокирует UDP? (Погугли TURN-серверы — мы их не делаем, но полезно знать)
- Почему ICE candidates могут прийти раньше offer? Что значит «браузер уже знает свой адрес, но ещё не знает адрес собеседника»?
- Что произойдёт, если Caller нажмёт «Позвонить» дважды подряд? Как это предотвратить?
- Почему треки нужно явно останавливать, а не только закрывать `RTCPeerConnection`?
