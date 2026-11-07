# Альтернативный хостинг фронтенда

Зачем: у части российских провайдеров запросы к `swypemeal.ru` (Vercel)
зависают. Диагностика показывает, что HTML и Supabase открываются, а JS-бандл
с Vercel — нет, поэтому приложение остаётся на экране загрузки. Тестовый деплой
на другой CDN позволяет проверить эту гипотезу, не трогая основной домен.

Главное правило: браузер должен по-прежнему обращаться только к своему origin.
CDN проксирует `/api/*` на Render и `/images/*` на Unsplash. Если открыть
Render напрямую, из РФ он тоже может быть недоступен.

## Текущий тестовый стенд (Cloudflare Workers)

Развёрнут на аккаунте Cloudflare (`samataidar`):

- **https://swypemeal-test.samataidar.workers.dev**
- Проверено: `/` → 200, `/api/health` → `healthy`, `/api/diag` → 200,
  `/images/*` → 200.
- Передеплой: `npx wrangler deploy --config wrangler.worker.jsonc`
  (переменные `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
- Вход через Google начнёт работать после добавления
  `https://swypemeal-test.samataidar.workers.dev/**` в Supabase →
  Authentication → URL Configuration → Redirect URLs.
- Свой домен можно привязать к Worker только если зона обслуживается
  Cloudflare; сейчас NS у reg.ru, поэтому используется `*.workers.dev`.

## Netlify (самый простой вариант)

В репозитории уже есть [`netlify.toml`](../netlify.toml): сборка `npm run build`,
публикация `dist`, прокси `/api/*` и `/images/*`, SPA-fallback.

### 1. Переменные окружения

Netlify → Site configuration → Environment variables:

| Переменная | Значение |
|---|---|
| `VITE_SUPABASE_URL` | `https://bbelyefgpptozjfmeyqq.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon-ключ Supabase |
| `VITE_CLOUDINARY_CLOUD_NAME` | `ylksrnxy` |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `swypemeal_unsigned` |

`VITE_SITE_URL` можно не задавать: приложение теперь возвращает OAuth на
`window.location.origin`. Если задать — только адрес тестового сайта, иначе
после входа пользователь уедет на основной домен.

### 2. Деплой

Вариант A — через Git:

1. Netlify → Add new site → Import an existing project.
2. Выбрать `samataidar/SwypeMeal3`, ветку `main`.
3. Build command и publish directory подхватятся из `netlify.toml`.
4. Deploy.

Вариант B — из терминала:

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

Для CLI нужен `NETLIFY_AUTH_TOKEN` (Personal access token) и `NETLIFY_SITE_ID`.

### 3. Разрешить новый домен в Supabase

Supabase → Authentication → URL Configuration → Redirect URLs добавить:

```
https://<site-name>.netlify.app
https://<site-name>.netlify.app/**
```

Иначе Google OAuth после входа вернёт на старый Site URL.

### 4. Проверка

1. Открыть `https://<site-name>.netlify.app/api/health` — должен быть
   `{"status":"healthy",...}`.
2. Открыть `https://<site-name>.netlify.app/api/diag` и прогнать диагностику.
   Все пункты, включая «JS-бандл приложения», должны быть зелёными.
3. Открыть корень сайта, войти через Google, проверить очередь и историю.

Ограничение Netlify: прокси-запрос таймаутится через 26 секунд. На бесплатном
Render первый запрос после простоя иногда дольше; перед тестом откройте
`/api/health` и подождите, пока backend проснётся.

## Быстрый тест на Cloudflare без аккаунта (Workers)

Если нужно проверить гипотезу прямо сейчас, можно развернуть тот же `dist` как
Cloudflare Worker на временном preview-аккаунте:

```bash
npm run build
npx wrangler deploy --config wrangler.worker.jsonc --temporary
```

Wrangler создаст временный аккаунт и выдаст ссылку вида
`https://swypemeal-test.<random>.workers.dev`. Аккаунт можно «забрать» по
claim-ссылке в течение 60 минут, иначе он будет удалён. Повторный запуск
команды переиспользует тот же временный аккаунт, пока он жив.

Важно: `wrangler.worker.jsonc` содержит `"run_worker_first": ["/api/*",
"/images/*"]`. Без этого SPA-fallback отдаёт `index.html` на `/api/*` раньше,
чем Worker успевает проксировать запрос.

Это тестовый, а не постоянный вариант: `*.workers.dev` может быть недоступен
у части провайдеров, а временный аккаунт живёт ограниченное время. Для
постоянного теста используйте Pages (ниже) или свой домен.

## Cloudflare Pages

В репозитории уже есть всё необходимое:

- `functions/api/[[path]].js` — прокси `/api/*` на Render;
- `functions/images/[[path]].js` — прокси `/images/*` на Unsplash;
- `functions/_lib/proxy.js` — общий код прокси;
- `functions/_middleware.js` — SPA-fallback для клиентских маршрутов;
- `wrangler.toml` — проект `swypemeal-test`, вывод в `dist`.

Отдельный `_redirects` не используется: Cloudflare не умеет проксировать
внешние домены через него, а Netlify читает этот файл раньше `netlify.toml`.
Middleware решает задачу только на Cloudflare и не мешает Netlify.

### 1. Переменные окружения

При деплое через Git (Cloudflare Pages → Connect to Git) добавьте в
Settings → Environment variables те же переменные, что и для Netlify:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
```

Build command: `npm run build`, build output directory: `dist`.

`VITE_SITE_URL` не задавайте — OAuth вернётся на `*.pages.dev`.

### 2. Деплой из терминала

```bash
npm run build
npx wrangler pages deploy dist --project-name swypemeal-test
```

Для неинтерактивного деплоя нужны `CLOUDFLARE_API_TOKEN` и
`CLOUDFLARE_ACCOUNT_ID`. Либо один раз выполните `npx wrangler login` —
токен сохранится локально.

### 3. Разрешить домен в Supabase

Supabase → Authentication → URL Configuration → Redirect URLs:

```
https://swypemeal-test.pages.dev
https://swypemeal-test.pages.dev/**
```

### 4. Проверка

```bash
curl https://swypemeal-test.pages.dev/api/health
curl -I https://swypemeal-test.pages.dev/assets/<bundle>.js
```

И открыть `https://swypemeal-test.pages.dev/api/diag` на проблемных
устройствах: пункт «JS-бандл приложения» должен стать зелёным.

## Если проблема не в Vercel

Признаки другого сценария:

- не открывается и HTML, и `/api/diag` — проблема с доменом/сетью, а не с
  бандлом;
- не открывается только один сайт, остальные работают — фильтрация у
  провайдера;
- на мобильном интернете всё работает, а на Wi-Fi нет — роутер, DNS или
  антивирус;
- ошибка `net::ERR_CERT_*` — HTTPS-перехват (антивирус/роутер).

В этих случаях помогает смена DNS на `1.1.1.1` / `8.8.8.8`, отключение
HTTPS-сканирования в антивирусе или проверка с мобильного интернета.
