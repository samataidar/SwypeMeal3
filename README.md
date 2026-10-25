# SwypeMeal — Планирование питания

> Решает проблему «что приготовить?» за 1–2 минуты вместо 15–30 минут листания рецептов.

## 🎯 Ключевые возможности

### Основные функции

1. **FIFO очередь по умолчанию** — новые рецепты добавляются в конец очереди, готовим из начала
2. **Ручное управление порядком** — кнопки вверх/вниз для гибкости (не нарушает FIFO)
3. **Запрет дубликатов** — один рецепт = одна запись в очереди
4. **Умная фильтрация в свайпе** — рецепты из очереди не показываются повторно
5. **Без повторов в сессии** — показанные рецепты не повторяются до сброса
6. **Автоматическая нумерация** — удаление из очереди пересчитывает позиции без пропусков
7. **Атомарная готовка** — приготовление = удаление из очереди + добавление в историю (транзакция)
8. **Опциональная оценка** — можно пропустить рейтинг и заметки
9. **Локальное хранение** — гость может свайпать, данные в localStorage (без синхронизации)
10. **Добавление рецептов** — пользователи могут создавать рецепты, публикация после модерации

### Дополнительные фичи

- **Свайп-механика** — выбирайте рецепты свайпом как в Tinder
- **КБЖУ** — калории, белки, жиры, углеводы для каждого блюда
- **Фильтры** — настройте предпочтения по калориям, времени, сложности и категориям
- **История** — отслеживайте что готовили, с оценками и заметками
- **Статистика** — общие калории, время готовки, средний рейтинг
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
2. Создайте бота через [@BotFather](https://t.me/BotFather)
3. Настройте Web App URL в боте
4. Frontend автоматически определит окружение Telegram

**Важно:** Для Telegram нужен HTTPS и свой домен.

## 🏗️ Структура проекта

```
├── src/
│   ├── App.tsx              # Главный компонент с навигацией
│   ├── types.ts             # TypeScript типы
│   ├── data.ts              # База рецептов (mock)
│   ├── store.ts             # Управление состоянием (localStorage)
│   ├── components/
│   │   ├── SwipeView.tsx    # Свайп-механика выбора рецептов
│   │   ├── CookQueue.tsx    # Очередь готовки (FIFO + ручное управление)
│   │   ├── History.tsx      # История приготовленных блюд
│   │   ├── AddRecipe.tsx    # Форма добавления нового рецепта
│   │   └── Settings.tsx     # Настройки фильтров
│   └── index.css            # Стили
├── backend/
│   ├── main.py              # FastAPI сервер
│   ├── requirements.txt     # Python зависимости
│   └── README.md            # Документация API
├── HOSTING.md               # Инструкция по хостингу
└── index.html               # HTML entry point
```

## 📊 API Endpoints

### Рецепты
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/recipes` | Рецепты с фильтрацией |
| GET | `/api/recipes/{id}` | Детали рецепта |
| POST | `/api/recipes/submit` | Отправить рецепт на модерацию |
| GET | `/api/recipes/pending` | Рецепты на модерации |
| POST | `/api/recipes/approve/{id}` | Одобрить рецепт |
| DELETE | `/api/recipes/pending/{id}` | Отклонить рецепт |
| GET | `/api/recipes/custom` | Одобренные пользовательские рецепты |

### Очередь
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/queue/{user_id}` | Очередь готовки |
| POST | `/api/queue/{user_id}` | Добавить в очередь (FIFO) |
| DELETE | `/api/queue/{user_id}/{item_id}` | Удалить из очереди |

### Готовка и история
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/cook/{user_id}` | Отметить приготовленным (атомарно) |
| GET | `/api/history/{user_id}` | История готовки |
| DELETE | `/api/history/{user_id}/{item_id}` | Удалить из истории |

### Свайпы и настройки
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/swipe/{user_id}` | Записать свайп (like/dislike) |
| GET | `/api/preferences/{user_id}` | Настройки |
| PUT | `/api/preferences/{user_id}` | Обновить настройки |
| POST | `/api/reset/{user_id}` | Сбросить свайпы |
| GET | `/api/stats/{user_id}` | Статистика |

### Telegram
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/telegram/init` | Инициализация Telegram Mini App |

## 🎨 Технологии

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** — стилизация
- **Lucide React** — иконки
- **Native Pointer Events** — свайп-механика
- **CSS Animations** — плавные переходы

### Backend
- **Python 3.8+**
- **FastAPI** — REST API
- **Pydantic** — валидация данных
- **File-based storage** (JSON) — легко заменить на PostgreSQL

## 📖 Детальное описание функций

### 1. FIFO очередь

```typescript
// Новые рецепты добавляются в конец
addToQueue(recipe) {
  queue.push(recipe); // FIFO
}
```

### 2. Ручное управление порядком

```typescript
// Кнопки вверх/вниз в CookQueue
moveUp(itemId) {
  // Меняем местами с предыдущим элементом
}
```

### 3. Защита от дубликатов

```typescript
addToQueue(recipe) {
  if (queue.find(item => item.recipe.id === recipe.id)) {
    return; // Уже в очереди
  }
  queue.push(recipe);
}
```

### 4. Фильтрация в свайпе

```typescript
availableRecipes = allRecipes.filter(recipe => 
  !queue.find(q => q.recipe.id === recipe.id) // Не в очереди
);
```

### 5. Без повторов в сессии

```typescript
availableRecipes = allRecipes.filter(recipe => 
  !swipedIds.includes(recipe.id) // Не показан
);
```

### 6. Автоматическая нумерация

```typescript
// При удалении из очереди позиции пересчитываются
removeFromQueue(id) {
  queue = queue.filter(item => item.id !== id);
  // #1, #2, #3 автоматически обновляются
}
```

### 7. Атомарная готовка

```typescript
moveToHistory(queueItemId) {
  const item = queue.find(q => q.id === queueItemId);
  history.unshift({ ...item, cookedAt: now });
  queue = queue.filter(q => q.id !== queueItemId);
  // Обе операции в одной транзакции
}
```

### 8. Опциональная оценка

```typescript
// Rating и notes могут быть undefined
moveToHistory(id, rating?, notes?)
```

### 9. Локальное хранение

```typescript
// Данные в localStorage
localStorage.setItem('swypemeal_queue', JSON.stringify(queue));
// Нет синхронизации между устройствами
```

### 10. Модерация рецептов

```typescript
// Пользователь отправляет рецепт
submitRecipe(recipe) → pending_recipes

// Модератор одобряет
approveRecipe(id) → custom_recipes (появляется в общем каталоге)
```

## 🌐 Хостинг

Подробная инструкция по деплою: **[HOSTING.md](HOSTING.md)**

### Быстрый старт:

**Frontend (Vercel):**
```bash
npm run build
# Загрузите dist/ на vercel.com
```

**Backend (Railway):**
```bash
cd backend
railway up
```

**Telegram Mini App:**
1. Создайте бота через @BotFather
2. Укажите Web App URL
3. Готово!

## 📝 Roadmap

- [ ] Аутентификация пользователей
- [ ] Синхронизация между устройствами
- [ ] Социальные функции (делиться рецептами)
- [ ] Интеграция с доставкой продуктов
- [ ] AI-рекомендации на основе истории
- [ ] Мультиязычность
- [ ] PWA (Progressive Web App)

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
