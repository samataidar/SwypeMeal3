# 🍽️ SwypeMeal

**Приложение для выбора рецептов методом свайпа.**

Свайпайте блюда влево/вправо, собирайте очередь готовки и отслеживайте историю приготовленного.

- **Frontend:** https://swype-meal3.vercel.app/
- **Backend API:** https://swypemeal.onrender.com/
- **API Docs:** https://swypemeal.onrender.com/docs

---

## Стек

### Frontend

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 4
- Lucide React (иконки)
- Supabase JS (Auth)
- Native Pointer Events + CSS-анимации

### Backend

- Python 3.12
- FastAPI + Pydantic
- httpx
- Supabase REST API (service_role) в production
- JSON-файлы в `backend/data/` как fallback для локальной разработки

### Инфраструктура

- **Frontend:** Vercel
- **Backend:** Render
- **База данных и Auth:** Supabase

---

## Быстрый старт

### Frontend

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

Приложение откроется на http://localhost:3000.

```bash
npm run typecheck   # проверка TypeScript
npm test            # unit-тесты (Vitest)
npm run build       # production-сборка в dist/
```

### Backend

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env      # Windows: copy .env.example .env
uvicorn main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

### Тесты

```bash
npm test                      # frontend: Vitest (src/**/*.test.ts)
python -m pytest backend/tests  # backend: FastAPI TestClient
```

CI (`.github/workflows/ci.yml`) на каждый push в `main` и PR запускает:
`typecheck`, `test`, `build` для фронтенда и `py_compile`, `pytest` для backend.

---

## Переменные окружения

### Frontend (`.env`)

```env
VITE_SUPABASE_URL=https://bbelyefgpptozjfmeyqq.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_URL=http://localhost:8000
VITE_SITE_URL=https://swype-meal3.vercel.app
VITE_CLOUDINARY_CLOUD_NAME=ylksrnxy
VITE_CLOUDINARY_UPLOAD_PRESET=swypemeal_unsigned
```

`VITE_API_URL` используется только в dev-режиме. В production фронтенд
обращается к своему origin (`/api/...`), а Vercel проксирует запросы на Render
через `vercel.json`.

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://bbelyefgpptozjfmeyqq.supabase.co
SUPABASE_KEY=<service_role-key>
USE_SUPABASE=true
CORS_ORIGINS=https://swype-meal3.vercel.app,https://swypemeal.ru,https://www.swypemeal.ru,http://localhost:3000,http://localhost:5173
ALLOW_INSECURE_AUTH=false
```

`SUPABASE_KEY` — только **service_role** ключ и только на сервере.
`ALLOW_INSECURE_AUTH=true` разрешает заголовок `X-User-ID` вместо токена и
предназначен исключительно для локальной разработки.

---

## Архитектура

```
React (Vercel)
  ├── Supabase Auth  ──►  access token
  └── /api/*  ──►  Vercel rewrite  ──►  FastAPI (Render)
                                          ├── Supabase REST API (service_role)
                                          └── backend/data/*.json (fallback)
```

### Почему API идёт через Vercel

`swypemeal.onrender.com` и `images.unsplash.com` блокируются частью российских
провайдеров (TLS-соединение сбрасывается). Поэтому production-фронтенд не
обращается к Render напрямую:

- `/api/*` проксируется Vercel на Render (`vercel.json`);
- `/images/*` проксируется Vercel на Unsplash (`vercel.json`);
- frontend всегда использует same-origin URL, поэтому работает и на
  `swypemeal.ru`, и на `swype-meal3.vercel.app`, и на preview-доменах.

Если backend переедет на другой домен, обновите `destination` в `vercel.json`.

- Frontend хранит состояние в `useStore` и дублирует его в `localStorage`.
- При включённой синхронизации данные подтягиваются с backend.
- Backend проверяет Supabase access token через `/auth/v1/user` и сверяет
  `user_id` из пути с ID пользователя из токена.
- Административные эндпоинты дополнительно проверяют роль `admin` в `user_roles`.

---

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/recipes` | Рецепты с фильтрацией |
| GET | `/api/recipes/{id}` | Детали рецепта |
| POST | `/api/recipes/submit` | Отправить рецепт на модерацию |
| GET | `/api/recipes/custom` | Одобренные пользовательские рецепты |
| GET | `/api/recipes/pending` | Рецепты на модерации (admin) |
| POST | `/api/recipes/{id}/approve` | Одобрить рецепт (admin) |
| POST | `/api/recipes/{id}/reject` | Отклонить рецепт (admin) |
| GET | `/api/queue/{user_id}` | Очередь готовки |
| POST | `/api/queue/{user_id}` | Добавить в очередь |
| DELETE | `/api/queue/{user_id}/{item_id}` | Удалить из очереди |
| POST | `/api/cook/{user_id}` | Отметить приготовленным |
| GET | `/api/history/{user_id}` | История готовки |
| DELETE | `/api/history/{user_id}/{item_id}` | Удалить из истории |
| POST | `/api/swipe/{user_id}` | Записать свайп |
| GET | `/api/preferences/{user_id}` | Настройки |
| PUT | `/api/preferences/{user_id}` | Обновить настройки |
| POST | `/api/reset/{user_id}` | Сбросить свайпы |
| GET | `/api/stats/{user_id}` | Статистика |
| GET | `/api/user/role/{user_id}` | Роль пользователя |
| GET | `/` | Статус API |
| GET | `/api/health` | Проверка здоровья |

Все пользовательские и административные эндпоинты требуют:

```http
Authorization: Bearer <supabase_access_token>
```

---

## Структура проекта

```
.
├── src/
│   ├── App.tsx                 # Главный компонент и навигация
│   ├── main.tsx                # Точка входа
│   ├── api.ts                  # REST-клиент backend
│   ├── store.ts                # Состояние + синхронизация
│   ├── data.ts                 # Встроенная база рецептов
│   ├── types.ts                # Типы
│   ├── components/             # UI-компоненты
│   ├── contexts/AuthContext.tsx
│   ├── lib/supabase.ts         # Supabase client
│   ├── utils/imageOptimizer.ts # Оптимизация изображений
│   └── utils/imageUrl.ts       # Проксирование Unsplash через /images
├── backend/
│   ├── main.py                 # FastAPI-приложение
│   ├── requirements.txt
│   ├── .env.example
│   ├── init_db.sql             # Схема БД
│   ├── add_roles.sql           # Таблица ролей
│   ├── create_storage_bucket.sql
│   ├── fix_rls.sql             # Исторические SQL-исправления RLS
│   ├── fix_rls_and_duplicates.sql
│   └── update_images.sql       # URL изображений для seed-рецептов
├── docs/                       # Подробные инструкции
├── AGENTS.md                   # Контекст для нового сеанса
├── index.html
├── package.json
├── render.yaml                 # Конфигурация Render
├── vercel.json                 # Rewrites /api и /images
└── vite.config.js              # Dev-прокси /api и /images
```

---

## Документация

- [docs/supabase-rest-api.md](docs/supabase-rest-api.md) — как backend работает с Supabase
- [docs/auth-setup.md](docs/auth-setup.md) — Google OAuth
- [docs/oauth-multi-device.md](docs/oauth-multi-device.md) — OAuth на нескольких устройствах
- [docs/roles.md](docs/roles.md) — роли и администраторы
- [docs/rls.md](docs/rls.md) — RLS и защита данных
- [docs/cloudinary.md](docs/cloudinary.md) — загрузка изображений
- [docs/image-optimization.md](docs/image-optimization.md) — оптимизация изображений
- [backend/README.md](backend/README.md) — backend API и деплой

---

## Известные ограничения

- RLS в Supabase пока отключён для `user_roles` и `pending_recipes`.
- `useStore` не привязан к пользователю: ключи `localStorage` общие, данные
  могут переходить между аккаунтами на одном устройстве.
- `swiped_ids` не загружаются с backend при синхронизации.
- Ручной порядок очереди хранится только локально.
- `Promise.allSettled` в `syncFromBackend` может показать успех, даже если все
  запросы завершились ошибкой.

Актуальный список задач и контекст — в [AGENTS.md](AGENTS.md).
