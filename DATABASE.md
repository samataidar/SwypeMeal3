# 🗄️ База данных SwypeMeal

Полное руководство по настройке и использованию базы данных.

---

## 📊 Архитектура хранения

SwypeMeal поддерживает **два режима** хранения данных:

### 1. File Storage (по умолчанию)
- **Где:** JSON файлы в папке `backend/data/`
- **Для чего:** Разработка, тестирование, small-scale deployment
- **Плюсы:** ✅ Простота, ✅ Не требует БД, ✅ Быстрый старт
- **Минусы:** ❌ Не масштабируется, ❌ Данные теряются при перезапуске (Render Free)

### 2. PostgreSQL (production)
- **Где:** Render PostgreSQL или любой другой PostgreSQL сервер
- **Для чего:** Production, многопользовательский режим
- **Плюсы:** ✅ Масштабируемость, ✅ Надёжность, ✅ ACID транзакции
- **Минусы:** ❌ Требует настройки, ❌ Стоимость ($7/мес на Render)

---

## 🚀 Быстрый старт с PostgreSQL на Render

### Шаг 1: Создайте PostgreSQL базу

1. Зайдите на [render.com](https://render.com)
2. **New +** → **PostgreSQL**
3. Настройки:
   ```
   Name: swypemeal-db
   Database: swypemeal
   User: swypemeal
   Region: Oregon (или ближайший)
   Instance Type: Free ($0) или Starter ($7/мес)
   ```
4. Нажмите **Create Database**

### Шаг 2: Получите connection string

После создания БД, скопируйте **Internal Database URL**:
```
postgresql://swypemeal:password@swypemeal-db:5432/swypemeal
```

### Шаг 3: Добавьте переменную окружения в backend

В настройках Web Service (backend):
1. **Environment** → **Environment Variables**
2. Добавьте:
   ```
   Key: DATABASE_URL
   Value: postgresql://swypemeal:password@swypemeal-db:5432/swypemeal
   ```
3. Добавьте:
   ```
   Key: USE_DATABASE
   Value: true
   ```

### Шаг 4: Перезапустите backend

Render автоматически перезапустит сервис после изменения переменных окружения.

### Шаг 5: Проверьте

```bash
curl https://swypemeal.onrender.com/
```

Должно вернуть:
```json
{
  "message": "SwypeMeal API v2.0",
  "status": "running",
  "storage": "PostgreSQL"
}
```

---

## 📁 Структура БД

### Таблицы

```
users
├── id (PK)
├── created_at
└── updated_at

recipes
├── id (PK)
├── title
├── description
├── image
├── cook_time
├── servings
├── calories
├── protein
├── fat
├── carbs
├── ingredients (JSON)
├── steps (JSON)
├── tags (JSON)
├── difficulty
├── is_custom
├── author_id
├── status (pending/approved/rejected)
├── created_at
└── updated_at

queue_items
├── id (PK)
├── user_id (FK → users)
├── recipe_id (FK → recipes)
├── position (для FIFO)
├── added_at
└── planned_date

history_items
├── id (PK)
├── user_id (FK → users)
├── recipe_id (FK → recipes)
├── cooked_at
├── rating (1-5)
└── notes

swiped_recipes
├── id (PK)
├── user_id (FK → users)
├── recipe_id (FK → recipes)
├── action (like/dislike)
└── swiped_at

user_preferences
├── id (PK)
├── user_id (FK → users, UNIQUE)
├── max_calories
├── max_cook_time
├── exclude_tags (JSON)
├── preferred_difficulty (JSON)
└── updated_at
```

### Диаграмма связей

```
users 1───N queue_items
users 1───N history_items
users 1───N swiped_recipes
users 1───1 user_preferences

recipes 1───N queue_items
recipes 1───N history_items
recipes 1───N swiped_recipes
```

---

## 🔧 Локальная разработка с PostgreSQL

### Вариант 1: Docker PostgreSQL

```bash
# Запустите PostgreSQL в Docker
docker run -d \
  --name swypemeal-postgres \
  -e POSTGRES_USER=swypemeal \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=swypemeal \
  -p 5432:5432 \
  postgres:15

# Запустите backend
DATABASE_URL="postgresql://swypemeal:password@localhost:5432/swypemeal" \
USE_DATABASE=true \
uvicorn main:app --reload
```

### Вариант 2: Локальный PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql
sudo -u postgres createuser swypemeal
sudo -u postgres createdb swypemeal
sudo -u postgres psql -c "ALTER USER swypemeal WITH PASSWORD 'password';"

# Запустите backend
DATABASE_URL="postgresql://swypemeal:password@localhost:5432/swypemeal" \
USE_DATABASE=true \
uvicorn main:app --reload
```

### Вариант 3: SQLite (для тестов)

```bash
DATABASE_URL="sqlite:///./swypemeal.db" \
USE_DATABASE=true \
uvicorn main:app --reload
```

---

## 🔄 Миграции (Alembic)

Для управления схемой БД используется Alembic.

### Установка

```bash
pip install alembic
cd backend
alembic init alembic
```

### Настройка alembic.ini

```ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql://swypemeal:password@localhost:5432/swypemeal
```

### Создание миграции

```bash
# Автоматическая миграция на основе моделей
alembic revision --autogenerate -m "Initial migration"

# Применить миграцию
alembic upgrade head

# Откатить последнюю миграцию
alembic downgrade -1
```

---

## 📊 Мониторинг и бэкапы

### Render PostgreSQL

**Бэкапы:**
- Render автоматически делает бэкапы каждый день
- Хранятся 7 дней (Free) или 30 дней (Starter)
- Восстановление через Dashboard

**Мониторинг:**
```bash
# Подключитесь к БД
psql $DATABASE_URL

# Проверьте размер таблиц
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Количество записей
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'queue_items', COUNT(*) FROM queue_items
UNION ALL
SELECT 'history_items', COUNT(*) FROM history_items;
```

### Ручной бэкап

```bash
# Экспорт
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Импорт
psql $DATABASE_URL < backup_20240101.sql
```

---

## 🎯 Оптимизация

### Индексы

Автоматически создаются для:
- Primary keys
- Foreign keys
- Часто запрашиваемых полей (user_id, recipe_id)

### Query Optimization

```python
# Плохо (N+1 проблема)
items = db.query(QueueItem).all()
for item in items:
    recipe = db.query(Recipe).get(item.recipe_id)  # Отдельный запрос!

# Хорошо (JOIN)
items = db.query(QueueItem).options(joinedload(QueueItem.recipe)).all()
```

### Connection Pooling

Настроено в `database.py`:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=5,  # 5 соединений в пуле
    pool_pre_ping=True,  # Проверка перед использованием
)
```

---

## 🔐 Безопасность

### Переменные окружения

**НЕ коммитьте** `.env` файлы!

```bash
# .env (добавьте в .gitignore)
DATABASE_URL=postgresql://user:pass@localhost/swypemeal
SECRET_KEY=your-secret-key
```

### .gitignore

```
.env
*.db
backend/data/*.json
```

### SSL/TLS

Render автоматически предоставляет SSL для PostgreSQL.

Для локальной разработки:
```python
# database.py
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "sslmode": "require"  # Для production
    }
)
```

---

## 📈 Масштабирование

### Вертикальное (Render)

1. **Free** → **Starter** ($7/мес)
   - 256 MB RAM → 1 GB RAM
   - 10 GB storage → 100 GB storage
   - Auto-backups (30 дней)

2. **Starter** → **Standard** ($20/мес)
   - 2 GB RAM
   - 500 GB storage

### Горизонтальное

Для больших нагрузок:
- Read replicas
- Connection pooling (PgBouncer)
- Sharding по user_id

---

## 🐛 Troubleshooting

### Ошибка: "could not connect to server"

**Решение:**
```bash
# Проверьте DATABASE_URL
echo $DATABASE_URL

# Проверьте доступность БД
psql $DATABASE_URL -c "SELECT 1;"
```

### Ошибка: "relation does not exist"

**Решение:**
```bash
# Создайте таблицы
python -c "from database import init_db; init_db()"

# Или через Alembic
alembic upgrade head
```

### Ошибка: "too many clients already"

**Решение:**
```python
# Уменьшите pool_size в database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=3,  # Было 5
    max_overflow=2  # Было 10
)
```

### Данные не сохраняются

**Проверьте:**
1. `USE_DATABASE=true` в переменных окружения
2. `DATABASE_URL` корректный
3. Backend использует `main_v2.py` (не старый `main.py`)

---

## 📊 Сравнение: File Storage vs PostgreSQL

| Характеристика | File Storage | PostgreSQL |
|----------------|--------------|------------|
| **Скорость** | ⚡ Очень быстро | ⚡ Быстро |
| **Масштаб** | 👤 1 пользователь | 👥 Множество пользователей |
| **Надёжность** | ❌ Данные теряются | ✅ ACID транзакции |
| **Стоимость** | ✅ Бесплатно | 💰 $7/мес (Render) |
| **Настройка** | ✅ Из коробки | ⚙️ Требует настройки |
| **Бэкапы** | ❌ Вручную | ✅ Автоматические |
| **Query** | ❌ Только JSON | ✅ SQL, индексы |
| **Транзакции** | ❌ Нет | ✅ Полная поддержка |

---

## 🎯 Рекомендации

### Для разработки
✅ File Storage (по умолчанию)  
✅ Быстрый старт без настройки  
✅ Легко отлаживать

### Для production
✅ PostgreSQL на Render  
✅ Автоматические бэкапы  
✅ Масштабируемость  
✅ Надёжность

### Миграция с File Storage на PostgreSQL

1. Создайте PostgreSQL БД
2. Добавьте `DATABASE_URL` и `USE_DATABASE=true`
3. Перезапустите backend
4. Данные из file storage **не мигрируются автоматически**
5. Пользователи начнут с чистой БД

---

## 📞 Поддержка

- Render PostgreSQL Docs: https://render.com/docs/databases
- SQLAlchemy Docs: https://docs.sqlalchemy.org/
- PostgreSQL Docs: https://www.postgresql.org/docs/

---

**Готово! Ваша БД настроена и готова к production использованию.** 🎉
