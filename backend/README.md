# SwypeMeal Backend

Python backend для приложения планирования питания SwypeMeal.

## Установка

```bash
cd backend
pip install -r requirements.txt
```

## Запуск

```bash
uvicorn main:app --reload --port 8000
```

Сервер будет доступен по адресу: http://localhost:8000

## API Документация

После запуска сервера, документация доступна по адресам:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/recipes` | Получить рецепты с фильтрацией |
| GET | `/api/recipes/{id}` | Детали рецепта |
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
| GET | `/api/telegram/init` | Инициализация Telegram Mini App |

## Хранение данных

Данные пользователей хранятся в JSON-файлах в папке `data/`. 
Для production-использования рекомендуется заменить на PostgreSQL или MongoDB.

## Telegram Mini App

Для интеграции с Telegram:
1. Создайте бота через @BotFather
2. Настройте Web App URL на ваш фронтенд
3. Используйте `/api/telegram/init` для инициализации
