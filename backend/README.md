# SwypeMeal Backend

Python backend для приложения планирования питания SwypeMeal.

## Установка

```bash
cd backend
pip install -r requirements.txt
```

## Запуск локально

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
| POST | `/api/recipes/submit` | Отправить рецепт на модерацию |
| GET | `/api/recipes/pending` | Рецепты на модерации |
| POST | `/api/recipes/approve/{id}` | Одобрить рецепт |
| DELETE | `/api/recipes/pending/{id}` | Отклонить рецепт |
| GET | `/api/recipes/custom` | Одобренные пользовательские рецепты |
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

## Деплой на Render.com

### Шаг 1: Подготовка

Убедитесь, что в корне репозитория есть файлы:
- `runtime.txt` — фиксация версии Python (3.12.7)
- `Procfile` — команда запуска
- `render.yaml` — конфигурация (опционально)

### Шаг 2: Создание сервиса

1. Зайдите на [render.com](https://render.com) и войдите
2. Нажмите **"New +"** → **"Web Service"**
3. Подключите ваш GitHub репозиторий
4. Настройте параметры:

```
Name: swypemeal-backend
Region: Oregon (или ближайший)
Branch: main
Root Directory: backend
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
Instance Type: Free
```

### Шаг 3: Переменные окружения

В разделе **"Environment"** добавьте:
```
PYTHON_VERSION=3.12.7
```

### Шаг 4: Деплой

Нажмите **"Create Web Service"**. Render автоматически:
- Определит Python 3.12.7 из `runtime.txt`
- Установит зависимости из `requirements.txt`
- Запустит сервер через `Procfile`

### Troubleshooting

**Ошибка: `pydantic-core` не компилируется**

Решение: используйте Python 3.12 (не 3.14). Убедитесь, что `runtime.txt` содержит:
```
python-3.12.7
```

**Ошибка: `Module not found: main`**

Решение: проверьте, что Root Directory установлен в `backend`.

**Ошибка: CORS**

Решение: добавьте URL фронтенда в `allow_origins` в `main.py`.

## Хранение данных

Данные пользователей хранятся в JSON-файлах в папке `data/`. 

⚠️ **Важно для Render Free Tier:**
- Файловая система эфемерная — данные удаляются при перезапуске
- Для production используйте PostgreSQL или Redis

### Миграция на PostgreSQL

```python
# Установите зависимости
pip install sqlalchemy psycopg2-binary

# Обновите models и storage
# См. https://fastapi.tiangolo.com/tutorial/sql-databases/
```

## Telegram Mini App

Для интеграции с Telegram:
1. Создайте бота через @BotFather
2. Настройте Web App URL на ваш фронтенд
3. Используйте `/api/telegram/init` для инициализации

## Требования

- Python 3.12+ (рекомендуется 3.12.7)
- FastAPI 0.115+
- Pydantic 2.10+
- Uvicorn 0.32+

## Лицензия

MIT
