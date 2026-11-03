# AGENTS.md — контекст для нового сеанса

Документ описывает текущее состояние проекта SwypeMeal, чтобы новый сеанс мог
продолжить работу без повторного аудита. Обновляйте его при значимых изменениях.

Дата последнего обновления: 2026-11-02.

---

## 1. Текущее состояние git

- Ветка: `fix/backend-auth-security`
- HEAD: `1eae4a2` — `fix: secure backend API and repair cook/swipe sync`
- Ветка запушена в `origin/fix/backend-auth-security`
- PR: https://github.com/samataidar/SwypeMeal3/pull/new/fix/backend-auth-security
- `origin/main` содержит 4 коммита, которых нет в базовой ветке; конфликтов по
  затронутым файлам не ожидается.
- Cleanup мёртвого кода, лишних зависимостей и документации выполнен отдельным
  коммитом в этой же ветке (см. `git log`).

### Что уже сделано в `1eae4a2`

- Исправлены сломанные `POST /api/cook/{user_id}` и `POST /api/swipe/{user_id}`
  (тело запроса и несуществующая переменная `data`).
- Добавлена проверка Supabase access token через `/auth/v1/user`.
- `user_id` в пути обязан совпадать с ID из токена.
- `author_id` и `moderator_id` берутся только из токена.
- Добавлена проверка роли `admin` для модерации.
- CORS ограничен известными origin'ами + Vercel preview.
- Очередь, свайп и `GET /api/recipes/{id}` поддерживают custom-рецепты.
- Frontend отправляет `Authorization: Bearer ...`, добавлены timeout'ы.
- Обновлены `.env.example`, `backend/.env.example`, `backend/README.md`.

### Проверки, которые проходили

```bash
npm run typecheck
npm run build
python -m py_compile backend/main.py
```

Smoke-тесты FastAPI через `TestClient` (file storage + `ALLOW_INSECURE_AUTH=true`):

- запрос без токена → `401`;
- чужой `user_id` → `403`;
- admin-эндпоинт обычным пользователем → `403`;
- очередь, готовка, история, свайп → `200`.

Живой Supabase JWT не тестировался — в окружении не было ключей.

---

## 2. Архитектура

```
React 18 + TS + Vite (Vercel)
  ├── Supabase Auth (Google OAuth) → access token
  ├── localStorage (кэш состояния)
  └── /api/* → Vercel rewrite → FastAPI (Render)
                                  ├── Supabase REST API (service_role)
                                  └── backend/data/*.json (fallback)
```

### Доступ из России

`swypemeal.onrender.com` и `images.unsplash.com` блокируются частью российских
провайдеров: TCP-соединение устанавливается, но TLS/HTTP зависает и фронтенд
получает `AbortError` по таймауту. Поэтому в production нельзя обращаться к
Render напрямую.

- `vercel.json` проксирует `/api/*` на Render и `/images/*` на Unsplash.
- `src/api.ts` в production использует same-origin (`API_URL = ''`).
- `src/utils/imageUrl.ts` переводит `https://images.unsplash.com/...` в
  `/images/...`.
- В dev-режиме те же пути проксирует Vite (`vite.config.js`).

Если меняется домен backend — обновить `destination` в `vercel.json`.

### Frontend

- `src/App.tsx` — навигация, экраны, вход/выход, admin-панель.
- `src/store.ts` — `useStore`: очередь, история, свайпы, настройки,
  синхронизация. Состояние дублируется в `localStorage`.
- `src/api.ts` — REST-клиент. Сам достаёт access token из Supabase-сессии,
  ставит `Authorization`, таймаут 60 секунд.
- `src/contexts/AuthContext.tsx` — Supabase Auth, `user`, `session`, `signOut`.
- `src/lib/supabase.ts` — singleton Supabase client.
- `src/data.ts` — встроенные рецепты (используются, если backend недоступен).
- `src/components/*` — SwipeView, CookQueue, History, Settings, AddRecipe,
  AdminPanel, LoginPage, ImageUpload.
- `src/utils/imageOptimizer.ts` — сжатие изображений перед загрузкой в Cloudinary.

### Backend

- `backend/main.py` — всё приложение в одном файле.
- `SupabaseClient` — тонкая обёртка над Supabase REST API (`/rest/v1/...`),
  использует `service_role` ключ.
- `USE_SUPABASE=true` + валидные ключи → Supabase; иначе JSON-файлы в
  `backend/data/`.
- `DATA_DIR` вычисляется от расположения `main.py`, поэтому запуск из любой
  рабочей директории безопасен.
- Auth:
  - `verify_supabase_token()` → `GET {SUPABASE_URL}/auth/v1/user`;
  - `get_current_user()` — зависимость FastAPI;
  - `require_admin()` — проверка роли в `user_roles`;
  - `ensure_user_access()` — запрет доступа к чужому `user_id`.
- `ALLOW_INSECURE_AUTH=true` разрешает `X-User-ID` без токена. Только локально.

### Хранение данных

- Очередь, история, настройки, свайпы — по `user_id`.
- `RECIPES_DB` — встроенные рецепты; custom-рецепты читаются из Supabase
  (`recipes` / `pending_recipes`).
- `get_recipe_by_id()` ищет и во встроенных, и в custom-рецептах.

---

## 3. Команды

### Frontend

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build      # dist/
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Проверка backend без Supabase

```powershell
$env:USE_SUPABASE='false'
$env:ALLOW_INSECURE_AUTH='true'
@'
import sys
sys.path.insert(0, "backend")
from fastapi.testclient import TestClient
import main
client = TestClient(main.app)
h = {"X-User-ID": "test-user"}
assert client.get("/api/queue/test-user").status_code == 401
assert client.post("/api/queue/test-user", params={"recipe_id": "1"}, headers=h).status_code == 200
print("OK")
'@ | python -
```

Не коммитьте `backend/data/*.json` — они в `.gitignore`.

---

## 4. Переменные окружения

### Frontend

| Переменная | Назначение |
|---|---|
| `VITE_SUPABASE_URL` | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | Публичный anon-ключ |
| `VITE_API_URL` | Локальный backend для dev; в production игнорируется |
| `VITE_SITE_URL` | Redirect URL для OAuth |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset |

### Backend

| Переменная | Назначение |
|---|---|
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_KEY` | **service_role** ключ, только сервер |
| `USE_SUPABASE` | `true` — Supabase, иначе JSON-файлы |
| `CORS_ORIGINS` | Список origin'ов через запятую |
| `ALLOW_INSECURE_AUTH` | `true` только для локальной разработки |

---

## 5. Известные проблемы (по приоритету)

### P0 — безопасность и изоляция данных

1. **RLS в Supabase отключён.**
   - `backend/fix_rls.sql` и `backend/fix_rls_and_duplicates.sql` явно
     отключают RLS у `user_roles` и `pending_recipes`.
   - `backend/init_db.sql` не включает RLS и политики.
   - Нужно: включить RLS на всех пользовательских таблицах, добавить политики
     `auth.uid() = user_id`, отдельные политики для admin.
   - Учесть, что backend ходит с `service_role` и обходит RLS; политики нужны
     для прямого доступа клиента и как defense-in-depth.

2. **`useStore` не привязан к пользователю.**
   - Ключи `swypemeal_queue`, `swypemeal_history`, `swypemeal_swiped`,
     `swypemeal_preferences` глобальные.
   - При смене аккаунта на одном устройстве возможна утечка данных.
   - Нужно: добавить `user.id` в ключи или очищать/перезагружать состояние при
     смене пользователя в `AuthContext`/`App`.

### P1 — корректность синхронизации

3. `syncFromBackend` не загружает `swiped_ids` с backend — после перезагрузки
   свайпы восстанавливаются только из localStorage.
4. Ручной порядок очереди (`moveQueueUp`/`moveQueueDown`) хранится только
   локально и теряется при синхронизации.
5. `Promise.allSettled` в `syncFromBackend` всегда завершается успешно, даже
   если все запросы упали. Нужно проверять `status === 'rejected'` и выставлять
   `syncStatus = 'error'`.
### P2 — качество

6. `src/data.ts` и backend `RECIPES_DB` дублируют набор рецептов — нужно
   определить единственный источник истины.
7. Нет автотестов (кроме ручных smoke-проверок). Кандидат: pytest для backend,
   Vitest для store.
8. `package-lock.json` показывает 2 high severity vulnerabilities —
   проверить `npm audit`.

---

## 6. Следующие шаги

1. Задеплоить `vercel.json` и проверить `https://swypemeal.ru/api/health`
   без VPN, а также вход и админ-панель.
2. Смержить `fix/backend-auth-security` в `main` после ревью PR.
3. Блок RLS:
   - написать `backend/enable_rls.sql` с политиками;
   - убрать отключение RLS из старых скриптов или пометить их как исторические;
   - проверить доступ anon-ключом и service_role.
4. Привязать `localStorage` к `user.id`.
5. Доработать синхронизацию: `swiped_ids`, порядок очереди, обработка ошибок.
6. Добавить тесты и CI (`typecheck`, `build`, `py_compile`, pytest).

---

## 7. Подводные камни

- **Windows + Python:** не добавляйте не-ASCII символы в `print()` backend —
  консоль `cp1251` падает с `UnicodeEncodeError`. Используйте `[OK]`, `[WARN]`,
  `[ERROR]`.
- **Supabase:** backend использует REST API, а не прямое PostgreSQL-подключение.
  `DATABASE_URL`, `psycopg`, SQLAlchemy больше не нужны.
- **Ключи:** `SUPABASE_KEY` на backend — `service_role`; на frontend —
  только `anon`. Не перепутать.
- **CORS:** при новом домене добавить его в `CORS_ORIGINS` или в
  `allow_origin_regex` в `main.py`.
- **Vercel preview:** OAuth redirect должен быть добавлен в Supabase Auth →
  URL Configuration, иначе вход с preview-домена не сработает.
- **Render Free:** файловая система эфемерная; без Supabase данные JSON
  теряются при рестарте.
- **Блокировки в РФ:** не обращайтесь к `*.onrender.com` и
  `images.unsplash.com` напрямую из браузера. Используйте same-origin
  `/api/*` и `/images/*`, которые проксирует Vercel. Проверка:
  `curl https://swypemeal.ru/api/health`.
- **ID очереди:** локальный optimistic ID (`Date.now()...`) заменяется на
  серверный только после `syncFromBackend()`. Учитывайте это при действиях
  сразу после добавления.
- **`npm run build`:** не запускайте без `npm install` после изменения
  `package.json`.

---

## 8. Документация

- `README.md` — обзор, запуск, API, структура.
- `backend/README.md` — backend, авторизация, деплой.
- `docs/supabase-rest-api.md` — REST API вместо прямого PostgreSQL.
- `docs/auth-setup.md` — Google OAuth.
- `docs/oauth-multi-device.md` — OAuth на нескольких устройствах.
- `docs/roles.md` — роли и администраторы.
- `docs/rls.md` — RLS: текущее состояние и как включить правильно.
- `docs/cloudinary.md` — загрузка изображений.
- `docs/image-optimization.md` — оптимизация изображений.
