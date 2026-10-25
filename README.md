# SwypeMeal — Планирование питания

> Решает проблему «что приготовить?» за 1–2 минуты вместо 15–30 минут листания рецептов.

## 🎯 Что реализовано

### 10 ключевых требований

✅ **1. FIFO очередь** — новые рецепты добавляются в конец, готовим из начала  
✅ **2. Ручное управление** — кнопки ↑/↓ для изменения порядка  
✅ **3. Защита от дубликатов** — один рецепт = одна запись в очереди  
✅ **4. Умная фильтрация** — рецепты из очереди не показываются в свайпе  
✅ **5. Без повторов** — показанные рецепты не повторяются до сброса  
✅ **6. Автоматическая нумерация** — удаление пересчитывает позиции  
✅ **7. Атомарная готовка** — приготовление = удаление из очереди + добавление в историю  
✅ **8. Опциональная оценка** — можно пропустить рейтинг и заметки  
✅ **9. Локальное хранение** — данные в localStorage (без синхронизации по умолчанию)  
✅ **10. Добавление рецептов** — публикация после модерации

### Дополнительные фичи

- 🔄 **Синхронизация с backend** — опциональная, включается в настройках
- 📱 **Telegram Mini App** — готов к интеграции
- 🎨 **Свайп-механика** — как в Tinder
- 📊 **КБЖУ** — калории, белки, жиры, углеводы
- 🎛️ **Фильтры** — по калориям, времени, сложности, категориям
- 📈 **Статистика** — общие калории, время, средний рейтинг
- 🗄️ **PostgreSQL** — поддержка production БД

## 🌐 Деплой

### Frontend
**URL:** https://swype-meal3.vercel.app/  
**Платформа:** Vercel

### Backend
**URL:** https://swypemeal.onrender.com/  
**Платформа:** Render  
**API Docs:** https://swypemeal.onrender.com/docs

### База данных

#### Текущий режим: File Storage
- Данные хранятся в JSON файлах
- Работает из коробки
- Не требует настройки

#### Production режим: PostgreSQL
Для включения PostgreSQL:

1. Создайте БД на Render:
   - **New +** → **PostgreSQL**
   - Name: `swypemeal-db`

2. Добавьте переменные окружения в backend:
   ```
   DATABASE_URL=postgresql://user:pass@host/db
   USE_DATABASE=true
   ```

3. Перезапустите backend

**Подробная инструкция:** [DATABASE.md](DATABASE.md)

## 🚀 Быстрый старт

### Frontend (локально)
```bash
npm install
npm run dev
```
Откройте: http://localhost:5173

### Backend (локально)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API Docs: http://localhost:8000/docs

## 📱 Telegram Mini App

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Настройте Web App URL:
   ```
   /setmenubutton → @your_bot → Menu → https://swype-meal3.vercel.app
   ```
3. Готово!

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
| POST | `/api/recipes/submit` | Отправить рецепт на модерацию |

**Полная документация:** https://swypemeal.onrender.com/docs

## 🏗️ Архитектура

```
┌─────────────────┐
│   Frontend      │
│   (Vercel)      │
│                 │
│  - React 18     │
│  - TypeScript   │
│  - Tailwind     │
│  - localStorage │
└────────┬────────┘
         │
         │ API calls (опционально)
         │
┌────────▼────────┐
│   Backend       │
│   (Render)      │
│                 │
│  - FastAPI      │
│  - Python 3.12  │
│  - File/PostgreSQL│
└────────┬────────┘
         │
         │ (если USE_DATABASE=true)
         │
┌────────▼────────┐
│   PostgreSQL    │
│   (Render)      │
│                 │
│  - SQLAlchemy   │
│  - ACID         │
│  - Backups      │
└─────────────────┘
```

## 📁 Структура проекта

```
swypemeal/
├── src/
│   ├── App.tsx              # Главный компонент
│   ├── api.ts               # API клиент для backend
│   ├── store.ts             # State management + синхронизация
│   ├── types.ts             # TypeScript типы
│   ├── data.ts              # База рецептов (mock)
│   └── components/
│       ├── SwipeView.tsx    # Свайп-механика
│       ├── CookQueue.tsx    # Очередь готовки (FIFO)
│       ├── History.tsx      # История приготовленных
│       ├── AddRecipe.tsx    # Форма добавления рецепта
│       └── Settings.tsx     # Настройки + синхронизация
├── backend/
│   ├── main.py              # FastAPI сервер (file storage)
│   ├── main_v2.py           # FastAPI сервер (с поддержкой БД)
│   ├── database.py          # SQLAlchemy конфигурация
│   ├── models.py            # SQLAlchemy модели
│   ├── crud.py              # CRUD операции
│   └── requirements.txt     # Python зависимости
├── DATABASE.md              # Документация по БД
├── DEPLOY_RENDER.md         # Инструкция по деплою на Render
├── HOSTING.md               # Общая инструкция по хостингу
└── README.md                # Этот файл
```

## 🎨 Технологии

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** — стилизация
- **Lucide React** — иконки
- **Native Pointer Events** — свайп-механика
- **CSS Animations** — плавные переходы

### Backend
- **Python 3.12**
- **FastAPI** — REST API
- **Pydantic** — валидация
- **SQLAlchemy** — ORM (для PostgreSQL)
- **File storage** — по умолчанию

## 🔧 Настройка синхронизации

### Режим 1: Только localStorage (по умолчанию)
- Данные сохраняются в браузере
- Работает офлайн
- Нет синхронизации между устройствами

### Режим 2: С синхронизацией
1. Откройте **Настройки** → **Синхронизация**
2. Включите переключатель
3. Данные будут синхронизироваться с backend
4. Работает на всех устройствах

**Индикатор статуса:**
- 🟢 **Онлайн** — синхронизация активна
- 🟡 **Оффлайн** — backend недоступен
- ⚫ **Локально** — синхронизация отключена

## 📈 Roadmap

- [ ] Аутентификация пользователей (JWT)
- [ ] Социальные функции (делиться рецептами)
- [ ] Интеграция с доставкой продуктов
- [ ] AI-рекомендации на основе истории
- [ ] Мультиязычность (i18n)
- [ ] PWA (Progressive Web App)
- [ ] Push-уведомления
- [ ] Экспорт/импорт рецептов

## 🤝 Contributing

1. Fork репозитория
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT

---

**Создано с ❤️ для тех, кто устал думать "что приготовить"**

### Полезные ссылки

- **Frontend:** https://swype-meal3.vercel.app/
- **Backend:** https://swypemeal.onrender.com/
- **API Docs:** https://swypemeal.onrender.com/docs
- **Документация БД:** [DATABASE.md](DATABASE.md)
- **Инструкция по деплою:** [DEPLOY_RENDER.md](DEPLOY_RENDER.md)
