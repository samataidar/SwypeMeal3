# 🔧 Настройка Supabase для SwypeMeal

Пошаговая инструкция по подключению backend к вашей Supabase БД.

---

## 📋 Что у вас есть

✅ Supabase проект: `https://bbelyefgpptozjfmeyqq.supabase.co`  
✅ PostgreSQL база данных создана  
✅ Файлы для инициализации БД готовы

---

## 🚀 Пошаговая настройка

### Шаг 1: Получите Connection String

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq)
2. Перейдите в **Settings** → **Database**
3. Найдите раздел **Connection string**
4. Выберите вкладку **URI**
5. Скопируйте строку подключения

Формат будет такой:
```
postgresql://postgres:[YOUR-PASSWORD]@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
```

⚠️ **Важно:** Замените `[YOUR-PASSWORD]` на ваш пароль от БД!

**Где найти пароль:**
- Settings → Database → Database Password
- Или сбросьте пароль, если забыли

---

### Шаг 2: Создайте таблицы в БД

1. В Supabase Dashboard перейдите в **SQL Editor** (иконка </> в боковом меню)
2. Нажмите **New Query**
3. Скопируйте содержимое файла `backend/init_db.sql`
4. Вставьте в SQL Editor
5. Нажмите **Run** (или Ctrl+Enter)

**Что будет создано:**
- ✅ Таблица `users` — пользователи
- ✅ Таблица `recipes` — рецепты
- ✅ Таблица `queue_items` — очередь готовки
- ✅ Таблица `history_items` — история приготовленных
- ✅ Таблица `swiped_recipes` — свайпнутые рецепты
- ✅ Таблица `user_preferences` — настройки пользователей
- ✅ Индексы для быстрого поиска
- ✅ Триггеры для автоматического обновления timestamps
- ✅ 3 начальных рецепта (опционально)

**Проверка:**
После выполнения запроса вы должны увидеть список созданных таблиц:
```
history_items
queue_items
recipes
swiped_recipes
user_preferences
users
```

---

### Шаг 3: Настройте переменные окружения на Render

1. Откройте ваш backend на [Render Dashboard](https://dashboard.render.com)
2. Перейдите в **Environment**
3. Добавьте следующие переменные:

**Обязательные:**
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
USE_DATABASE=true
```

**Опциональные (для frontend):**
```
VITE_SUPABASE_URL=https://bbelyefgpptozjfmeyqq.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Где найти anon key:**
- Settings → API
- Скопируйте **anon public** key

4. Нажмите **Save Changes**
5. Render автоматически перезапустит backend

---

### Шаг 4: Обновите backend код

Замените содержимое `backend/main.py` на `backend/main_v2.py`:

```bash
cd backend
mv main.py main_old.py
mv main_v2.py main.py
```

Или просто скопируйте код из `main_v2.py` в `main.py`.

---

### Шаг 5: Обновите зависимости

Убедитесь, что `backend/requirements.txt` содержит:

```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic>=2.10.0
python-multipart>=0.0.12
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
```

---

### Шаг 6: Задеплойте изменения

```bash
git add .
git commit -m "feat: Connect to Supabase PostgreSQL"
git push origin main
```

Render автоматически задеплоит новую версию.

---

### Шаг 7: Проверьте подключение

Откройте в браузере:
```
https://swypemeal.onrender.com/
```

Должно вернуть:
```json
{
  "message": "SwypeMeal API v2.0",
  "status": "running",
  "storage": "PostgreSQL"
}
```

✅ **Если видите `"storage": "PostgreSQL"` — всё работает!**

---

## 🔍 Проверка данных в Supabase

### Через Dashboard

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq)
2. Перейдите в **Table Editor** (иконка таблицы в боковом меню)
3. Выберите таблицу (например, `recipes`)
4. Вы увидите данные

### Через SQL Editor

```sql
-- Проверить количество пользователей
SELECT COUNT(*) FROM users;

-- Проверить очередь пользователя
SELECT * FROM queue_items WHERE user_id = 'your-user-id';

-- Проверить историю
SELECT * FROM history_items ORDER BY cooked_at DESC LIMIT 10;

-- Проверить настройки пользователя
SELECT * FROM user_preferences WHERE user_id = 'your-user-id';
```

---

## 🛠️ Обновлённый database.py

Замените `backend/database.py` на эту версию с поддержкой Supabase:

```python
"""
Database configuration for SwypeMeal Backend
Поддержка Supabase PostgreSQL
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Check if database is enabled
USE_DATABASE = os.getenv("USE_DATABASE", "false").lower() == "true" and DATABASE_URL is not None

if USE_DATABASE:
    # Supabase requires SSL
    if "supabase" in DATABASE_URL:
        # Ensure SSL mode is set
        if "?sslmode=" not in DATABASE_URL:
            DATABASE_URL += "?sslmode=require"
    
    # SQLAlchemy engine with Supabase-optimized settings
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,  # Recycle connections every 30 minutes
    )
    
    # Session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Base class for models
    Base = declarative_base()
    
    # Dependency for FastAPI
    def get_db():
        """Database session dependency"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    # Initialize database
    def init_db():
        """Create all tables (if they don't exist)"""
        Base.metadata.create_all(bind=engine)
else:
    # Fallback for file storage mode
    engine = None
    SessionLocal = None
    Base = None
    
    def get_db():
        yield None
    
    def init_db():
        pass
```

---

## 🧪 Тестирование

### Локальное тестирование

Создайте файл `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
USE_DATABASE=true
```

Запустите backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Проверьте API:
```bash
curl http://localhost:8000/
# Должно вернуть: {"storage": "PostgreSQL"}
```

### Тестирование API endpoints

```bash
# Получить рецепты
curl "https://swypemeal.onrender.com/api/recipes?user_id=test_user"

# Добавить в очередь
curl -X POST "https://swypemeal.onrender.com/api/queue/test_user?recipe_id=1"

# Получить очередь
curl "https://swypemeal.onrender.com/api/queue/test_user"

# Отметить приготовленным
curl -X POST "https://swypemeal.onrender.com/api/cook/test_user" \
  -H "Content-Type: application/json" \
  -d '{"queue_item_id": "...", "rating": 5, "notes": "Отлично!"}'

# Получить статистику
curl "https://swypemeal.onrender.com/api/stats/test_user"
```

---

## 🐛 Troubleshooting

### Ошибка: "could not connect to server"

**Причина:** Неправильный connection string или пароль

**Решение:**
1. Проверьте `DATABASE_URL` в переменных окружения
2. Убедитесь, что пароль правильный
3. Проверьте, что БД не приостановлена (Supabase Free tier pauses after 7 days of inactivity)

### Ошибка: "relation does not exist"

**Причина:** Таблицы не созданы

**Решение:**
1. Выполните `init_db.sql` в SQL Editor
2. Проверьте, что все таблицы созданы

### Ошибка: "SSL connection required"

**Причина:** Supabase требует SSL

**Решение:**
Убедитесь, что `database.py` добавляет `?sslmode=require` к connection string (уже сделано в обновлённой версии).

### Данные не сохраняются

**Проверьте:**
1. `USE_DATABASE=true` в переменных окружения
2. Backend использует обновлённый `main.py` (с поддержкой БД)
3. В логах Render нет ошибок подключения к БД

### Backend показывает "storage": "File Storage"

**Причина:** Переменные окружения не настроены

**Решение:**
1. Добавьте `DATABASE_URL` и `USE_DATABASE=true`
2. Перезапустите backend на Render

---

## 📊 Мониторинг Supabase

### Использование ресурсов

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq)
2. Перейдите в **Reports** → **Database**
3. Вы увидите:
   - Размер БД
   - Количество подключений
   - Query performance
   - CPU/RAM usage

### Логи

1. Перейдите в **Logs** → **Database**
2. Вы увидите все запросы к БД
3. Полезно для отладки

---

## 💰 Стоимость Supabase

### Free Tier
✅ 500 MB database size  
✅ 2 GB bandwidth  
✅ 50,000 monthly active users  
✅ Community support  

**Ограничения:**
- Проект приостанавливается после 7 дней неактивности
- Нужно вручную возобновлять

### Pro Tier ($25/мес)
✅ 8 GB database size  
✅ 250 GB bandwidth  
✅ Daily backups  
✅ No project pausing  
✅ Email support  

**Рекомендация:** Для production используйте Pro tier.

---

## 🔄 Миграция данных

Если у вас уже есть данные в file storage:

1. Экспортируйте данные из JSON файлов
2. Создайте SQL скрипт для импорта
3. Выполните в SQL Editor

**Пример:**
```sql
INSERT INTO users (id) VALUES ('user1'), ('user2');
INSERT INTO recipes (...) VALUES (...);
```

---

## 🎯 Следующие шаги

После успешного подключения:

1. ✅ Протестируйте все API endpoints
2. ✅ Проверьте синхронизацию frontend ↔ backend
3. ✅ Включите синхронизацию в настройках frontend
4. ✅ Настройте мониторинг и алерты
5. ✅ Настройте автоматические бэкапы

---

## 📞 Поддержка

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- SQLAlchemy Docs: https://docs.sqlalchemy.org/

---

**Готово! Ваша Supabase БД подключена к SwypeMeal!** 🎉
