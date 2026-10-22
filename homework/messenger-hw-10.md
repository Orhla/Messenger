# Домашнее задание 10 — Аудиозвонки через WebRTC

Это задание про новую для тебя технологию: WebRTC — стандарт браузера, позволяющий двум вкладкам передавать аудио (и видео) напрямую друг другу, минуя сервер. Мы добавим аудиозвонки в личные чаты. Звонить в комнаты не будем.

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
- **SDP** (Session Description Protocol) — это большой текстовый блоб с описанием: какие кодеки поддерживаю, какой порт слушаю, какие криптоалгоритмы. Caller генерирует offer-SDP, Callee отвечает answer-SDP.
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

**Важно:** ICE candidates начинают генерироваться сразу после `setLocalDescription`. Они могут прийти собеседнику ещё до того, как у него установлен `remoteDescription`. В этом случае надо их буферизировать и применить позже.

---

## Observability (обязательно)

Это задание про протокол, который не видно глазами. Поэтому мы делаем его видимым двумя способами.

### 1. Консоль браузера

Каждое взаимодействие с Supabase и каждое событие RTCPeerConnection логируется с префиксом. Открой DevTools → Console и ты должен видеть весь поток событий:

```
[Signaling] Подписываемся на канал: call:abc123_def456
[Signaling] Канал подключён
[WebRTC] Запрашиваем микрофон...
[WebRTC] Микрофон получен: AudioMediaStreamTrack
[WebRTC] Создаём RTCPeerConnection с STUN: stun:stun.l.google.com:19302
[WebRTC] Создаём offer...
[WebRTC] setLocalDescription (offer) применён
[Signaling] Отправляем сигнал: offer  { sdpLength: 1423, to: 'def456' }
[Signaling] Получен сигнал: offer  от abc123
[WebRTC] setRemoteDescription (offer) применён
[WebRTC] Создаём answer...
[WebRTC] setLocalDescription (answer) применён
[Signaling] Отправляем сигнал: answer  { sdpLength: 1198, to: 'abc123' }
[WebRTC] ICE candidate найден: candidate:2113667327 1 udp 2122260223 192.168.1.5 58942 ...
[Signaling] Отправляем сигнал: ice-candidate  { candidate: '...' }
[Signaling] Получен сигнал: ice-candidate  от abc123
[WebRTC] addIceCandidate применён
[WebRTC] iceConnectionState: checking
[WebRTC] iceConnectionState: connected
[WebRTC] connectionState: connected  ← ЗВОНОК АКТИВЕН
[Signaling] Получен сигнал: call-end  от abc123
[WebRTC] Закрываем соединение и треки
[Signaling] Отписываемся от канала: call:abc123_def456
```

### 2. Системные сообщения в чате

Кроме консоли, события сигналинга отображаются прямо в области чата как серые системные сообщения — не в БД, только локально. Это даёт «живую» картину для обоих участников.

Примеры того, что должно появляться:

```
──── 📡 Вы инициируете звонок... ────
──── 📡 Offer отправлен (SDP: 1423 байта) ────
──── 📡 Получен answer от собеседника ────
──── 📡 ICE: проверяем маршруты... ────
──── 📡 Соединение установлено ────
──── 📞 Звонок завершён (00:42) ────
```

Или со стороны получателя:
```
──── 📡 Входящий звонок... ────
──── 📡 Вы приняли звонок, отправлен answer ────
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
    | { status: 'calling'; peerId: string }      // я инициирую
    | { status: 'ringing'; peerId: string; offer: RTCSessionDescriptionInit } // мне звонят
    | { status: 'connecting'; peerId: string }   // offer/answer обменяны
    | { status: 'connected'; peerId: string; startedAt: number };             // P2P активно

// Сигналы, которые летят через Supabase
export type CallSignal =
    | { type: 'offer';         sdp: RTCSessionDescriptionInit; from: string }
    | { type: 'answer';        sdp: RTCSessionDescriptionInit; from: string }
    | { type: 'ice-candidate'; candidate: RTCIceCandidateInit; from: string }
    | { type: 'call-end';      from: string }
    | { type: 'call-reject';   from: string };
```

Подсказки:
- `SystemMessage` нет в БД и нет в маппере. Создавай их прямо в `DirectChat` и добавляй в `messages` через `setMessages`.
- `CallState` — дискриминированный union. В каждом статусе разные данные. Когда ты будешь писать `if (call.status === 'connected')`, TypeScript автоматически знает, что `call.startedAt` доступен.
- `RTCSessionDescriptionInit` и `RTCIceCandidateInit` — встроенные типы браузера, не нужно импортировать.

---

## Шаг 2. Слой сигналинга (`lib/supabase/signaling.ts`)

Этот файл только отправляет и получает сигналы через Supabase Realtime. Никакой логики WebRTC здесь нет.

```ts
export function getCallChannelId(userA: string, userB: string): string;
// Возвращает детерминированный ID канала независимо от порядка аргументов.
// Например: 'call:' + [userA, userB].sort().join('_')

export function subscribeToCallSignals(
    channelId: string,
    onSignal: (signal: CallSignal) => void,
): () => void;
// Создаёт Supabase channel, подписывается на broadcast-событие 'signal'.
// Возвращает функцию отписки (unsubscribe).

export async function broadcastCallSignal(
    channelId: string,
    signal: CallSignal,
): Promise<void>;
// Отправляет сигнал в канал через channel.send().
```

Подсказки по реализации:

- Supabase Realtime канал создаётся через `supabase.channel(channelId)`. Используй тот же `supabase` клиент, что и везде.
- Для broadcast: `channel.on('broadcast', { event: 'signal' }, handler).subscribe()`.
- Для отправки: `channel.send({ type: 'broadcast', event: 'signal', payload: signal })`.
- **Логируй всё:** при подписке, при получении каждого сигнала, при отправке — с префиксом `[Signaling]`.
- Канал надо создать один раз и переиспользовать для отправки и получения. Если создать два — они не увидят друг друга.

```ts
// Пример скелета
export function subscribeToCallSignals(channelId: string, onSignal: (signal: CallSignal) => void) {
    console.log('[Signaling] Подписываемся на канал:', channelId);
    
    const channel = supabase
        .channel(channelId)
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
            console.log('[Signaling] Получен сигнал:', payload.type, 'от', payload.from);
            onSignal(payload as CallSignal);
        })
        .subscribe((status) => {
            console.log('[Signaling] Статус канала:', status);
        });

    return () => {
        console.log('[Signaling] Отписываемся от канала:', channelId);
        supabase.removeChannel(channel);
    };
}
```

---

## Шаг 3. Хук `useWebRTC` (`hooks/useWebRTC.ts`)

Это самый сложный файл. Он управляет RTCPeerConnection и состоянием звонка.

```ts
type UseWebRTCOptions = {
    currentUserId: string;
    peerId: string;
    onSystemMessage: (text: string) => void; // колбэк для системных сообщений в чат
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

### Внутренняя структура хука

```ts
export function useWebRTC({ currentUserId, peerId, onSystemMessage }: UseWebRTCOptions) {
    const [callState, setCallState] = useState<CallState>({ status: 'idle' });
    
    // RTCPeerConnection живёт в ref, а не в state — он мутируется
    const pcRef = useRef<RTCPeerConnection | null>(null);
    
    // ICE candidates, пришедшие раньше remoteDescription
    const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
    
    const channelId = getCallChannelId(currentUserId, peerId);
    
    // Подписка на сигналы — один раз при монтировании
    useEffect(() => {
        const unsubscribe = subscribeToCallSignals(channelId, handleIncomingSignal);
        return unsubscribe;
    }, [channelId]);
    
    // ... остальная логика
}
```

### Вспомогательная функция: создание RTCPeerConnection

Вынеси создание в отдельную функцию внутри хука, чтобы не дублировать:

```ts
function createPeerConnection(): RTCPeerConnection {
    console.log('[WebRTC] Создаём RTCPeerConnection с STUN: stun:stun.l.google.com:19302');
    
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = ({ candidate }) => {
        if (!candidate) return;
        console.log('[WebRTC] ICE candidate найден:', candidate.candidate.substring(0, 60) + '...');
        broadcastCallSignal(channelId, {
            type: 'ice-candidate',
            candidate: candidate.toJSON(),
            from: currentUserId,
        });
    };

    pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] iceConnectionState:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setCallState(prev =>
                prev.status === 'connecting'
                    ? { status: 'connected', peerId, startedAt: Date.now() }
                    : prev
            );
            onSystemMessage('📡 Соединение установлено');
        }
    };
    
    pc.ontrack = (event) => {
        console.log('[WebRTC] Получен удалённый трек:', event.track.kind);
        // Воспроизводи удалённый аудиострим через Audio element
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
    };

    return pc;
}
```

### `startCall` (ты инициируешь звонок)

```ts
async function startCall() {
    onSystemMessage('📡 Вы инициируете звонок...');
    console.log('[WebRTC] Запрашиваем микрофон...');
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('[WebRTC] Микрофон получен');
    
    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pcRef.current = pc;
    
    console.log('[WebRTC] Создаём offer...');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('[WebRTC] setLocalDescription (offer) применён');
    
    console.log('[Signaling] Отправляем сигнал: offer', { sdpLength: offer.sdp?.length });
    await broadcastCallSignal(channelId, { type: 'offer', sdp: offer, from: currentUserId });
    onSystemMessage(`📡 Offer отправлен (SDP: ${offer.sdp?.length ?? 0} байт)`);
    
    setCallState({ status: 'calling', peerId });
}
```

### `handleIncomingSignal` (обработчик входящих сигналов)

Это центральная функция хука. Обрабатывает все типы сигналов:

```ts
async function handleIncomingSignal(signal: CallSignal) {
    // Игнорируем собственные сигналы
    if (signal.from === currentUserId) return;
    
    switch (signal.type) {
        case 'offer':
            onSystemMessage('📡 Входящий звонок...');
            setCallState({ status: 'ringing', peerId: signal.from, offer: signal.sdp });
            break;
            
        case 'answer':
            // ...setRemoteDescription, применить буферизированные ICE candidates
            break;
            
        case 'ice-candidate':
            if (pcRef.current?.remoteDescription) {
                await pcRef.current.addIceCandidate(signal.candidate);
                console.log('[WebRTC] addIceCandidate применён');
            } else {
                console.log('[WebRTC] ICE candidate буферизирован (нет remoteDescription)');
                iceCandidateQueueRef.current.push(signal.candidate);
            }
            break;
            
        case 'call-end':
        case 'call-reject':
            cleanup();
            break;
    }
}
```

### `acceptCall`

Вызывается, когда пользователь нажимает «Принять». К этому моменту offer уже лежит в `callState.offer`.

```ts
async function acceptCall() {
    if (callState.status !== 'ringing') return;
    
    const pc = createPeerConnection();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pcRef.current = pc;
    
    await pc.setRemoteDescription(callState.offer);
    console.log('[WebRTC] setRemoteDescription (offer) применён');
    
    // Применяем буферизированные кандидаты
    // ...
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    await broadcastCallSignal(channelId, { type: 'answer', sdp: answer, from: currentUserId });
    onSystemMessage('📡 Вы приняли звонок, answer отправлен');
    
    setCallState({ status: 'connecting', peerId });
}
```

### `cleanup` (закрытие соединения)

Вызывается при завершении или отклонении. Очень важно не забыть всё закрыть:

```ts
function cleanup() {
    console.log('[WebRTC] Закрываем соединение и треки');
    
    if (pcRef.current) {
        pcRef.current.getSenders().forEach(s => s.track?.stop());
        pcRef.current.close();
        pcRef.current = null;
    }
    
    iceCandidateQueueRef.current = [];
    setCallState({ status: 'idle' });
}
```

### `hangUp` и `rejectCall`

```ts
function hangUp() {
    const duration = callState.status === 'connected'
        ? Math.round((Date.now() - callState.startedAt) / 1000)
        : 0;
    
    broadcastCallSignal(channelId, { type: 'call-end', from: currentUserId });
    
    if (duration > 0) {
        const mm = Math.floor(duration / 60).toString().padStart(2, '0');
        const ss = (duration % 60).toString().padStart(2, '0');
        onSystemMessage(`📞 Звонок завершён (${mm}:${ss})`);
    } else {
        onSystemMessage('📞 Звонок завершён');
    }
    
    cleanup();
}
```

---

## Шаг 4. UI звонка (`components/CallOverlay.tsx`)

Два режима:
- **`ringing`**: «Входящий звонок от [email]» + кнопки «Принять» и «Отклонить»
- **`calling` / `connecting` / `connected`**: индикатор статуса + кнопка «Завершить»

```tsx
type Props = {
    callState: CallState;
    peerEmail: string;
    onAccept: () => void;
    onReject: () => void;
    onHangUp: () => void;
};

export default function CallOverlay({ callState, peerEmail, onAccept, onReject, onHangUp }: Props) {
    if (callState.status === 'idle') return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white border rounded-xl shadow-lg p-4 w-72 z-50">
            {callState.status === 'ringing' && (
                <>
                    <p className="text-sm font-medium">📞 Входящий звонок</p>
                    <p className="text-xs text-gray-500 mt-1">{peerEmail}</p>
                    <div className="flex gap-2 mt-3">
                        <button onClick={onAccept} className="flex-1 bg-green-500 text-white rounded-lg py-2 text-sm">
                            Принять
                        </button>
                        <button onClick={onReject} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm">
                            Отклонить
                        </button>
                    </div>
                </>
            )}
            {(callState.status === 'calling' || callState.status === 'connecting') && (
                <>
                    <p className="text-sm font-medium">
                        {callState.status === 'calling' ? '📡 Вызов...' : '🔄 Соединение...'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{peerEmail}</p>
                    <button onClick={onHangUp} className="w-full mt-3 bg-red-500 text-white rounded-lg py-2 text-sm">
                        Отменить
                    </button>
                </>
            )}
            {callState.status === 'connected' && (
                <>
                    <p className="text-sm font-medium">🟢 Звонок активен</p>
                    <p className="text-xs text-gray-500 mt-1">{peerEmail}</p>
                    <CallTimer startedAt={callState.startedAt} />
                    <button onClick={onHangUp} className="w-full mt-3 bg-red-500 text-white rounded-lg py-2 text-sm">
                        Завершить
                    </button>
                </>
            )}
        </div>
    );
}
```

`CallTimer` — маленький дочерний компонент, который показывает `00:42` и обновляется каждую секунду через `useEffect` + `setInterval`. Сделай его сама.

---

## Шаг 5. Системные сообщения в `ChatArea`

`SystemMessage` (type === 'system') рисуется иначе, чем обычное сообщение — по центру, серым, без аватара:

```tsx
// В ChatArea.tsx, в рендере списка сообщений:
if (msg.type === 'system') {
    return (
        <div key={msg.id} className="flex items-center justify-center my-2">
            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                {msg.text}
            </span>
        </div>
    );
}
```

---

## Шаг 6. Интеграция в `DirectChat`

```tsx
// DirectChat.tsx

function addSystemMessage(text: string) {
    setMessages(prev => [
        ...prev,
        {
            id: crypto.randomUUID(),
            type: 'system' as const,
            text,
            created_at: new Date().toISOString(),
        },
    ]);
}

const { callState, startCall, acceptCall, rejectCall, hangUp } = useWebRTC({
    currentUserId,
    peerId: chatId,
    onSystemMessage: addSystemMessage,
});
```

Кнопку «Позвонить» добавь в `ChatHeader` через `children` (он уже поддерживает `children`). Кнопка видна только когда `callState.status === 'idle'`.

```tsx
// В DirectChat.tsx, при рендере ChatView:
<ChatView
    // ... остальные пропсы
>
    {callState.status === 'idle' && (
        <button onClick={startCall} title="Позвонить">
            📞
        </button>
    )}
</ChatView>

// CallOverlay рендерится рядом с ChatView или в корне DirectChat
<CallOverlay
    callState={callState}
    peerEmail={activeChat.email}
    onAccept={acceptCall}
    onReject={rejectCall}
    onHangUp={hangUp}
/>
```

---

## Особые случаи (не пропускай)

### Буфер ICE candidates

Самая частая ошибка при реализации WebRTC — применять ICE candidates до того, как установлен `remoteDescription`. Браузер выбросит ошибку `Cannot add ICE candidate`. 

Решение: если `pc.remoteDescription === null`, клади кандидата в `iceCandidateQueueRef.current`. После `setRemoteDescription` — применяй всех из очереди и очищай её.

```ts
// После setRemoteDescription в handleIncomingSignal (case 'answer') и в acceptCall:
for (const candidate of iceCandidateQueueRef.current) {
    await pcRef.current!.addIceCandidate(candidate);
    console.log('[WebRTC] Применён буферизированный ICE candidate');
}
iceCandidateQueueRef.current = [];
```

### Cleanup при размонтировании

`useWebRTC` должен закрывать соединение, если компонент размонтируется (пользователь переключился на другой чат во время звонка):

```ts
useEffect(() => {
    return () => {
        if (pcRef.current) {
            console.log('[WebRTC] Компонент размонтирован — закрываем соединение');
            pcRef.current.close();
        }
    };
}, []);
```

### Отказ в доступе к микрофону

`getUserMedia` бросает `NotAllowedError`, если пользователь запретил доступ. Покажи понятную ошибку.

---

## Чек-лист

### Observability
- [ ] В консоли видны логи с префиксами `[Signaling]` и `[WebRTC]` для каждого шага
- [ ] В консоли виден каждый `iceConnectionState` переход
- [ ] В консоли видно, когда ICE candidate буферизируется (нет remoteDescription)
- [ ] В чате появляются системные сообщения с прогрессом звонка у обоих участников

### Звонок
- [ ] Caller нажимает «Позвонить», Callee видит входящий звонок
- [ ] Callee принимает — оба слышат друг друга
- [ ] Callee отклоняет — у Caller overlay исчезает, системное сообщение в чате
- [ ] Любая сторона нажимает «Завершить» — звонок заканчивается у обоих
- [ ] Таймер в оверлее считает секунды во время активного звонка
- [ ] В системном сообщении после завершения видна длительность

### Корректность
- [ ] Закрытие вкладки во время звонка — другая сторона получает `call-end` (или соединение разрывается само по ICE timeout — это нормально)
- [ ] Переключение на другой чат во время звонка закрывает соединение
- [ ] Отказ в доступе к микрофону показывает понятную ошибку, не крашит UI
- [ ] `npx tsc -b` проходит
- [ ] Нет утечек: `removeChannel` вызывается при отписке, треки закрываются при cleanup

---

## Вопросы, которые стоит обдумать

- Почему WebRTC называется peer-to-peer, если нам всё равно нужен Supabase для сигналинга?
- Что будет, если у одного из участников строгий корпоративный firewall, который блокирует UDP? (Подсказка: погугли про TURN-серверы — мы их не делаем, но знать полезно)
- Почему ICE candidates могут прийти раньше offer/answer? Что значит «мой браузер уже знает свой адрес, но ещё не знает адрес собеседника»?
- Что произойдёт, если Caller нажмёт «Позвонить» дважды быстро? Как это предотвратить?
- Почему треки нужно явно останавливать (`track.stop()`), а не только закрывать `RTCPeerConnection`?
