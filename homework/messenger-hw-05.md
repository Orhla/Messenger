# Домашнее задание 5 — E2E-шифрование для 1:1 чата

Идея: сервер (Supabase) хранит только нечитаемую кашу вместо текста сообщений. Расшифровать может только тот, у кого есть нужный приватный ключ — а приватный ключ никогда не покидает браузер пользователя.

Делаем маленькими шагами, каждый шаг можно проверить отдельно, не дожидаясь конца домашки.

---

## Матчасть — что почитать перед началом

Библиотека не нужна — всё шифрование встроено прямо в браузер, называется **Web Crypto API** (объект `crypto.subtle`). Ничего не устанавливаем для самого шифрования.

Документация (официальная, MDN):
- [SubtleCrypto — обзор](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) — все методы, с которыми будем работать
- [deriveKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) и [deriveBits](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits) — вычисление общего секрета
- [encrypt](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt) / [decrypt](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/decrypt) — сама шифровка

Для хранения приватного ключа в браузере (IndexedDB) возьмём маленькую библиотеку-обёртку, чтобы не писать руками низкоуровневый IndexedDB API:
```bash
npm install idb-keyval
```
[idb-keyval на GitHub](https://github.com/jakearchibald/idb-keyval) — по сути `localStorage`-подобный API, но умеет хранить бинарные данные и ключи.

Теория простыми словами (без формул с кривыми — общая идея алгоритмов):
- [Practical Cryptography for Developers](https://cryptobook.nakov.com/) — бесплатная книга, разделы про ECDH и AES-GCM объясняют именно то, что мы будем делать, с картинками и примерами кода
- [Спецификация W3C Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/) — если хочется свериться "а как оно должно себя вести по стандарту"
- Если хочется по-русски — поищи на Habr "ECDH простыми словами" или "AES-GCM объяснение", там периодически выходят разборы с картинками; конкретную ссылку не даю, чтобы не подсунуть битую

---

## Блок А — Миграции

### А1 — Публичный ключ в профиле

```sql
alter table profiles add column public_key text;
```
Пока `null` — заполнится позже, когда пользователь первый раз зайдёт после этой домашки. Публичный ключ не секрет, его может читать кто угодно (та же policy, что уже есть для `email`).

### А2 — Сообщения хранят шифротекст, а не текст

```sql
alter table messages rename column text to ciphertext;
alter table messages add column iv text not null default '';
```
`ciphertext` — само зашифрованное сообщение (в виде base64-строки). `iv` — рандомные 12 байт (тоже base64), свои для каждого сообщения, без них расшифровать нельзя даже с правильным ключом. `iv` — не секрет, хранить открыто нормально.

**Проверка:** миграция накатилась, таблицы поменяли форму, приложение пока не собирается (и это ожидаемо — код ещё не обновлён).

---

## Блок Б — Свой ключ: сгенерировать, сохранить, посмотреть

### Б1 — Функции для работы с ключами

Создай `src/lib/crypto.ts`:

```ts
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable — see объяснение ниже
    ['deriveBits'],
  )
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('spki', key)
  return arrayBufferToBase64(raw)
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64)
  return crypto.subtle.importKey(
    'spki', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, [],
  )
}

// ??? arrayBufferToBase64 / base64ToArrayBuffer — маленькие хелперы конвертации,
// напиши сам через btoa/atob
```

**Почему `extractable: true`, хотя раньше обсуждали, что приватный ключ лучше делать неизвлекаемым:** по заданию нужна кнопка "скачать ключ" (Блок Г) — а значит браузер обязан разрешить достать байты ключа наружу. Это осознанный компромисс: удобство бэкапа против чуть более широкой поверхности атаки (если кто-то получит доступ к твоему запущенному JS, он теоретически сможет вытащить ключ). Для учебного проекта — нормально, для продакшна стоило бы подумать над non-extractable + отдельным механизмом бэкапа.

### Б2 — Хранилище приватного ключа

Создай `src/lib/keystore.ts` на основе `idb-keyval`:

```ts
import { get, set } from 'idb-keyval'

const PRIVATE_KEY_STORAGE_KEY = 'e2e-private-key'

export async function savePrivateKey(key: CryptoKey): Promise<void> {
  await set(PRIVATE_KEY_STORAGE_KEY, key)
}

export async function loadPrivateKey(): Promise<CryptoKey | null> {
  const key = await get(PRIVATE_KEY_STORAGE_KEY)
  return key ?? null
}
```
`idb-keyval` умеет сохранять `CryptoKey` напрямую (без ручной сериализации) — браузер поддерживает это "из коробки".

**Проверка:** в консоли браузера вручную вызови `generateKeyPair()`, `savePrivateKey()`, `loadPrivateKey()` — убедись, что ключ пережил перезагрузку страницы.

### Б3 — Страница настроек

Создай `src/components/Settings.tsx` и добавь роут `/settings` в `App.tsx`. Пока — заготовка на будущее (в следующих домашках здесь же будет смена логина/пароля).

Две кнопки:

1. **"Сгенерировать ключ"** — если приватного ключа ещё нет: `generateKeyPair()` → сохранить приватный через `savePrivateKey()` → экспортировать публичный через `exportPublicKey()` → записать в `profiles.public_key` текущего юзера. Если ключ уже есть — предупреди пользователя, что генерация нового ключа сделает нечитаемой всю старую переписку (расшифровать её сможет только старый ключ, а он будет заменён).

2. **"Скачать ключ"** — экспортировать приватный ключ (`crypto.subtle.exportKey('pkcs8', privateKey)`), закодировать в base64, отдать браузеру как файл на скачивание (`Blob` + `<a download>` или `URL.createObjectURL`).

```tsx
// ??? скелет — заполни сам
async function handleDownloadKey() {
  const privateKey = await loadPrivateKey()
  if (!privateKey) return
  const raw = await crypto.subtle.exportKey('pkcs8', privateKey)
  // ??? превратить raw в base64, положить в Blob, скачать файл
}
```

**Проверка:** зайди под новым юзером → жми "Сгенерировать ключ" → в базе у профиля появился `public_key` → жми "Скачать ключ" → файл скачался, в нём что-то похожее на base64-кашу.

---

## Блок В — Шифруем и расшифровываем сообщения

### В1 — Общий секрет через ECDH

Раскладываем на два отдельных, простых шага — специально не объединяем в один вызов, чтобы явно видеть, что происходит на каждом этапе.

**Шаг 1 — вычислить сырой общий секрет (ECDH):**

```ts
export async function deriveSharedSecretBits(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    256, // сколько бит секрета хотим получить
  )
}
```
Результат — просто набор байт. Использовать его напрямую как ключ шифрования — плохая идея (он недостаточно "перемешан"), поэтому следующий шаг обязателен.

**Шаг 2 — "очистить" секрет и превратить в AES-ключ (HKDF):**

```ts
export async function deriveAesKeyFromSecret(
  secretBits: ArrayBuffer,
): Promise<CryptoKey> {
  // сначала говорим браузеру: "вот эти байты — материал для HKDF"
  const hkdfMaterial = await crypto.subtle.importKey(
    'raw', secretBits, 'HKDF', false, ['deriveKey'],
  )

  // а теперь из этого материала выводим настоящий AES-GCM ключ
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0), // для учебного проекта можно пустую соль
      info: new TextEncoder().encode('messenger-chat-key'),
    },
    hkdfMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // сам AES-ключ тоже делаем non-extractable — его наружу доставать незачем
    ['encrypt', 'decrypt'],
  )
}
```
`info` — просто метка "для чего этот ключ" (чтобы если тот же секрет когда-нибудь понадобится для другой цели, ключи не пересеклись). Значение можно оставить как есть.

**Проверка:** в консоли — сгенерируй две пары ключей (условно "Алиса" и "Боб"), вычисли секрет как `deriveSharedSecretBits(alicePrivate, bobPublic)` и как `deriveSharedSecretBits(bobPrivate, alicePublic)` — оба должны дать одинаковый результат (сравни через `arrayBufferToBase64`).

### В2 — Шифрование и расшифровка сообщения

```ts
export async function encryptText(
  key: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, encoded,
  )

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv),
  }
}

// ??? decryptText — обратная операция:
// принимает key, ciphertext (base64), iv (base64)
// возвращает исходный plaintext через crypto.subtle.decrypt + TextDecoder
```

### В3 — Кладём шифрование в поток отправки/чтения

В `messages.ts`:
- перед `sendMessage` — вычислить общий AES-ключ для пары (я, получатель) через В1, затем `encryptText`, в БД писать `ciphertext`+`iv` вместо текста
- после `fetchMessages` — для каждого сообщения расшифровать через тот же выведенный ключ

Секрет для пары (я, собеседник) можно закешировать в памяти на время открытого чата (`Map<receiverId, CryptoKey>`) — вычислять заново при каждом сообщении не нужно, ключи не меняются, пока не сгенерирован новый.

**Проверка:** открой два разных браузера/профиля, у обоих сгенерирован ключ, напиши сообщение — в таблице `messages` в Supabase Studio текст должен быть нечитаемой кашей, а в UI обеих сторон — нормальный текст.

---

## Что важно не забыть

- Если у собеседника `public_key` ещё `null` (не заходил после этой домашки) — отправка сообщения ему должна быть заблокирована с понятным текстом, а не падать с непонятной ошибкой.
- Общий секрет вычисляется заново в рантайме каждый раз, когда открываешь чат (для простоты, без персистентного кеша) — это нормально, он всё равно детерминирован и пересчитывается мгновенно.
- Приватный ключ живёт только в этом браузере. Если он потерян (очистили сайт-данные, сменили устройство без "скачать ключ") — вся старая переписка нечитаема навсегда. Это осознанное ограничение, не баг.
