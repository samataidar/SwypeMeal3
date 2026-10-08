# SwypeMeal — Планирование питания

> Решает проблему «что приготовить?» за 1–2 минуты вместо 15–30 минут листания рецептов.

## 🎯 Ключевые возможности

- **Свайп-механика** — выбирайте рецепты свайпом как в Tinder
- **Очередь готовки (FIFO)** — добавляйте в очередь и готовьте по порядку
- **История приготовленных** — отслеживайте что готовили, с оценками и заметками
- **КБЖУ** — калории, белки, жиры, углеводы для каждого блюда
- **Фильтры** — настройте предпочтения по калориям, времени, сложности и категориям
- **Telegram Mini App** — может работать как встроенное приложение в Telegram

## 🚀 Быстрый старт

### Frontend

```bash
npm install
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5173

### Backend (Python)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API документация: http://localhost:8000/docs

## 📱 Telegram Mini App

Для работы как Telegram Mini App:

1. В `index.html` уже подключён `telegram-web-app.js`
2. Настройте Web App URL в @BotFather
3. Frontend автоматически определит окружение Telegram

## 🏗️ Структура проекта

```
├── src/
│   ├── App.tsx              # Главный компонент с навигацией
│   ├── types.ts             # TypeScript типы
│   ├── data.ts              # База рецептов (mock)
│   ├── store.ts             # Управление состоянием (localStorage)
│   ├── components/
│   │   ├── SwipeView.tsx    # Свайп-механика выбора рецептов
│   │   ├── CookQueue.tsx    # Очередь готовки
│   │   ├── History.tsx      # История приготовленных блюд
│   │   └── Settings.tsx     # Настройки фильтров
│   └── index.css            # Стили
├── backend/
│   ├── main.py              # FastAPI сервер
│   ├── requirements.txt     # Python зависимости
│   └── README.md            # Документация API
└── index.html               # HTML entry point
```

## 🎨 Технологии

- **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend:** Python, FastAPI, Pydantic
- **Хранение:** localStorage (frontend) / JSON файлы (backend)

## 📊 API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/recipes` | Рецепты с фильтрацией |
| POST | `/api/swipe/{user_id}` | Свайп (like/dislike) |
| GET/POST/DELETE | `/api/queue/{user_id}` | Очередь готовки |
| POST | `/api/cook/{user_id}` | Отметить приготовленным |
| GET/DELETE | `/api/history/{user_id}` | История |
| GET/PUT | `/api/preferences/{user_id}` | Настройки |
| GET | `/api/stats/{user_id}` | Статистика |

## 📝 Лицензия

MIT
