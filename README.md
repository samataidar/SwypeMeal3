# 🍽️ SwypeMeal

**Приложение для выбора рецептов методом свайпа**

Выбирайте блюда как в Tinder — свайпайте влево/вправо, собирайте очередь готовки, отслеживайте историю приготовленных блюд.

---

## 🚀 Демо

- **Frontend:** https://swype-meal3.vercel.app/
- **Backend API:** https://swypemeal.onrender.com/
- **API Docs:** https://swypemeal.onrender.com/docs

---

## ✨ Возможности

### Основные функции

✅ **Свайп-механика** — выбирайте рецепты свайпом влево/вправо  
✅ **FIFO очередь** — новые рецепты добавляются в конец, готовим из начала  
✅ **Ручное управление** — кнопки ↑/↓ для изменения порядка  
✅ **Защита от дубликатов** — один рецепт = одна запись в очереди  
✅ **Умная фильтрация** — рецепты из очереди не показываются в свайпе  
✅ **Без повторов** — показанные рецепты не повторяются до сброса  
✅ **Автоматическая нумерация** — удаление пересчитывает позиции  
✅ **Атомарная готовка** — приготовление = удаление из очереди + добавление в историю  
✅ **Опциональная оценка** — можно пропустить рейтинг и заметки  
✅ **Добавление рецептов** — публикация после модерации  

### Дополнительные фичи

📊 **КБЖУ** — калории, белки, жиры, углеводы для каждого блюда  
🎛️ **Фильтры** — по калориям, времени, сложности, категориям  
📈 **Статистика** — общие калории, время, средний рейтинг  
🗄️ **PostgreSQL** — поддержка production БД (Supabase)  
🔄 **Синхронизация** — данные синхронизируются между устройствами  
📱 **Telegram Mini App** — готов к интеграции  

---

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
│  - SQLAlchemy   │
└────────┬────────┘
         │
         │ (если USE_DATABASE=true)
         │
┌────────▼────────┐
│   Supabase      │
│   PostgreSQL    │
│                 │
│  - ACID         │
│  - Backups      │
│  - SSL          │
└─────────────────┘
```

---

## 🛠️ Технологии

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
- **File storage** — fallback режим

### База данных
- **Supabase PostgreSQL** — production
- **File storage (JSON)** — разработка

---

## 📦 Установка и запуск

### Frontend

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для production
npm run build
```

Откройте: http://localhost:5173

### Backend

```bash
cd backend

# Установка зависимостей
pip install -r requirements.txt

# Запуск с file storage (по умолчанию)
uvicorn main:app --reload --port 8000

# Запуск с PostgreSQL
DATABASE_URL="postgresql://user:pass@host/db" USE_DATABASE=true uvicorn main:app --reload
```

API Docs: http://localhost:8000/docs

---

## 🗄️ Подключение Supabase PostgreSQL

### Быстрый старт (5 минут)

1. **Создайте таблицы в Supabase:**
   - Откройте [SQL Editor](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/sql)
   - Выполните код из `backend/init_db.sql`

2. **Добавьте переменные окружения на Render:**
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
   USE_DATABASE=true
   ```

3. **Задеплойте изменения:**
   ```bash
   git push origin main
   ```

4. **Проверьте:**
   ```bash
   curl https://swypemeal.onrender.com/
   # Должно вернуть: "storage": "PostgreSQL (Supabase)"
   ```

**Подробная инструкция:** [CONNECT_SUPABASE.md](CONNECT_SUPABASE.md)

---

## 📊 API Endpoints

### Рецепты
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/recipes` | Рецепты с фильтрацией |
| GET | `/api/recipes/{id}` | Детали рецепта |
| POST | `/api/recipes/submit` | Отправить рецепт на модерацию |
| GET | `/api/recipes/custom` | Одобренные пользовательские рецепты |

### Очередь
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/queue/{user_id}` | Очередь готовки |
| POST | `/api/queue/{user_id}` | Добавить в очередь |
| DELETE | `/api/queue/{user_id}/{item_id}` | Удалить из очереди |

### Готовка и история
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/cook/{user_id}` | Отметить приготовленным |
| GET | `/api/history/{user_id}` | История готовки |
| DELETE | `/api/history/{user_id}/{item_id}` | Удалить из истории |

### Свайпы и настройки
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/swipe/{user_id}` | Записать свайп |
| GET | `/api/preferences/{user_id}` | Настройки |
| PUT | `/api/preferences/{user_id}` | Обновить настройки |
| POST | `/api/reset/{user_id}` | Сбросить свайпы |
| GET | `/api/stats/{user_id}` | Статистика |

### Системные
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Статус API |
| GET | `/api/health` | Проверка здоровья БД |
| GET | `/api/telegram/init` | Инициализация Telegram Mini App |

**Полная документация:** https://swypemeal.onrender.com/docs

---

## 📱 Telegram Mini App

### Настройка

1. Создайте бота через [@BotFather](https://t.me/BotFather):
   ```
   /newbot → SwypeMeal Bot → @swypemeal_bot
   ```

2. Настройте Web App:
   ```
   /setmenubutton → @swypemeal_bot → Menu → https://swype-meal3.vercel.app
   ```

3. Готово! Бот будет открывать ваше приложение.

---

## 🔄 Режимы работы

### Режим 1: Только localStorage (по умолчанию)

✅ Данные сохраняются в браузере  
✅ Работает офлайн  
✅ Нет синхронизации между устройствами  
✅ Не требует backend  

**Использование:** Просто откройте frontend, всё работает из коробки.

### Режим 2: С синхронизацией (PostgreSQL)

✅ Данные синхронизируются между устройствами  
✅ Работает на всех устройствах  
✅ Требует backend и БД  
✅ Production-ready  

**Использование:**
1. Подключите Supabase (см. выше)
2. Включите синхронизацию в настройках frontend
3. Данные автоматически синхронизируются

---

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
│   ├── main.py              # FastAPI сервер (с поддержкой БД)
│   ├── database.py          # SQLAlchemy конфигурация
│   ├── models.py            # SQLAlchemy модели
│   ├── crud.py              # CRUD операции
│   ├── init_db.sql          # SQL скрипт для Supabase
│   ├── requirements.txt     # Python зависимости
│   └── .env.example         # Шаблон переменных окружения
├── CONNECT_SUPABASE.md      # Инструкция по подключению Supabase
├── DATABASE.md              # Документация по БД
├── DEPLOY_RENDER.md         # Инструкция по деплою на Render
├── HOSTING.md               # Общая инструкция по хостингу
└── README.md                # Этот файл
```

---

## 🎯 10 ключевых требований

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

---

## 🚀 Деплой

### Frontend на Vercel

1. Зарегистрируйтесь на [vercel.com](https://vercel.com)
2. Импортируйте репозиторий
3. Настройки:
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   ```
4. Deploy

### Backend на Render

1. Зарегистрируйтесь на [render.com](https://render.com)
2. Создайте Web Service
3. Подключите репозиторий
4. Настройки:
   ```
   Root Directory: backend
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Добавьте переменные окружения:
   ```
   PYTHON_VERSION=3.12.7
   DATABASE_URL=postgresql://...
   USE_DATABASE=true
   ```
6. Deploy

**Подробные инструкции:**
- [DEPLOY_RENDER.md](DEPLOY_RENDER.md) — деплой на Render
- [CONNECT_SUPABASE.md](CONNECT_SUPABASE.md) — подключение Supabase
- [HOSTING.md](HOSTING.md) — другие варианты хостинга

---

## 📚 Документация

- **[CONNECT_SUPABASE.md](CONNECT_SUPABASE.md)** — подключение Supabase PostgreSQL
- **[DATABASE.md](DATABASE.md)** — полная документация по БД
- **[DEPLOY_RENDER.md](DEPLOY_RENDER.md)** — деплой на Render
- **[HOSTING.md](HOSTING.md)** — общая инструкция по хостингу
- **API Docs:** https://swypemeal.onrender.com/docs

---

## 🐛 Troubleshooting

### Backend показывает "File Storage" вместо "PostgreSQL"

**Решение:**
1. Проверьте переменные окружения на Render
2. Убедитесь, что `DATABASE_URL` и `USE_DATABASE=true` добавлены
3. Перезапустите backend

### Ошибка подключения к БД

**Решение:**
1. Проверьте `DATABASE_URL` (правильный пароль, хост, порт)
2. Убедитесь, что таблицы созданы в Supabase
3. Проверьте логи на Render

### Данные не синхронизируются

**Решение:**
1. Включите синхронизацию в настройках frontend
2. Проверьте, что backend доступен
3. Нажмите "Обновить" для принудительной синхронизации

---

## 📈 Roadmap

- [ ] Аутентификация пользователей (JWT)
- [ ] Социальные функции (делиться рецептами)
- [ ] Интеграция с доставкой продуктов
- [ ] AI-рекомендации на основе истории
- [ ] Мультиязычность (i18n)
- [ ] PWA (Progressive Web App)
- [ ] Push-уведомления
- [ ] Экспорт/импорт рецептов

---

## 🤝 Contributing

1. Fork репозитория
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

---

## 📄 Лицензия

MIT

---

## 🔐 Безопасность

⚠️ **Важно:** Никогда не коммитьте пароли и secrets в Git!

- Используйте переменные окружения для sensitive данных
- Добавьте `.env` в `.gitignore`
- Регулярно меняйте пароли
- Включите 2FA для аккаунтов

---

## 📞 Поддержка

- **Frontend:** https://swype-meal3.vercel.app/
- **Backend:** https://swypemeal.onrender.com/
- **API Docs:** https://swypemeal.onrender.com/docs
- **Supabase Dashboard:** https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq

---

**Создано с ❤️ для тех, кто устал думать "что приготовить"**
