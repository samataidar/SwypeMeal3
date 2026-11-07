# Альтернативный хостинг фронтенда

Нужен как запасной вход, если основной домен недоступен у части провайдеров
(блокировка, «белые списки», отравленный DNS-кэш).

Схема не меняется: браузер ходит на свой origin, а хостинг проксирует
`/api/*` в Render и `/images/*` в Unsplash.

## Вариант A — новое имя на том же Vercel (5 минут, без нового аккаунта)

Самый быстрый тест: имя `swypemeal.ru` могло «залипнуть» в DNS-кэше провайдера
со старыми A-записями. Новое имя в той же зоне таких записей не имеет.

1. В DNS reg.ru добавить: `CNAME app → cname.vercel-dns.com`.
2. Vercel → Project → Settings → Domains → добавить `app.swypemeal.ru`.
3. Supabase → Authentication → URL Configuration → Redirect URLs:
   добавить `https://app.swypemeal.ru`.
4. В Vercel → Environment Variables задать `VITE_SITE_URL=https://app.swypemeal.ru`
   (иначе после Google-входа будет редирект на основной домен) и передеплоить.

Проверка: открыть `https://app.swypemeal.ru/api/diag` и посмотреть блок
«Доступность внешних сайтов».

## Вариант B — Netlify (другой CDN)

Конфигурация уже в репозитории — `netlify.toml` (прокси `/api`, `/images`
и SPA-фолбэк).

1. Netlify → Add new site → Import an existing project → GitHub
   `samataidar/SwypeMeal3`.
2. Build command и publish directory подхватятся из `netlify.toml`.
3. Environment variables (Site settings → Environment variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL=https://<site>.netlify.app`
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
4. Supabase → Authentication → URL Configuration → Redirect URLs:
   добавить `https://<site>.netlify.app`.
5. Deploy. Проверить `https://<site>.netlify.app/api/health` — должен вернуть
   `{"status":"healthy",...}`.

Проверка прокси:

```bash
curl https://<site>.netlify.app/api/health
curl -I https://<site>.netlify.app/images/photo-1548943487-a2e4e43b4853?w=100
```

Оба должны ответить `200`.

## Вариант C — Cloudflare Pages

Возможен, но для проксирования `/api/*` на внешний домен нужен Worker
(в `_redirects` Cloudflare внешние прокси не поддерживает). Схема:
Pages для статики + `functions/_middleware.js`, который проксирует `/api/*`
и `/images/*`. Плюс — сеть Cloudflare обычно доступнее в РФ, минус — больше
настройки.

## Важно для любого варианта

- `VITE_SITE_URL` **вшивается в бандл при сборке** — на каждом хосте он должен
  указывать на его собственный домен, иначе после OAuth пользователя унесёт на
  основной (возможно, недоступный) домен.
- Домен хоста нужно добавить в Supabase → Redirect URLs, иначе Google-вход
  вернёт ошибку `redirect_uri_mismatch`.
- Backend менять не нужно: он получает запросы через прокси, CORS не участвует.
- `vercel.json` и `netlify.toml` не конфликтуют: каждый хостинг читает свой файл.
