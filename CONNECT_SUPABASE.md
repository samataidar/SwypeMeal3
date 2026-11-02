# 🚀 Подключение Supabase к SwypeMeal

## ⚡ Быстрый старт (5 минут)

### 1. Создайте таблицы в Supabase

1. Откройте [Supabase SQL Editor](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/sql)
2. Скопируйте весь код из `backend/init_db.sql`
3. Вставьте и нажмите **Run**

✅ Таблицы созданы, начальные рецепты добавлены.

---

### 2. Добавьте переменные окружения на Render

1. Откройте [Render Dashboard](https://dashboard.render.com)
2. Выберите ваш backend сервис
3. Перейдите в **Environment**
4. Добавьте две переменные:

```
DATABASE_URL=postgresql://postgres:Фф13524690!!@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
USE_DATABASE=true
```

5. Нажмите **Save Changes**

⚠️ **Важно:** После настройки **смените пароль** в Supabase:
- Settings → Database → Database Password → Reset

---

### 3. Задеплойте изменения

```bash
git add .
git commit -m "feat: Connect to Supabase PostgreSQL"
git push origin main
```

Render автоматически задеплоит новую версию.

---

### 4. Проверьте подключение

Откройте: https://swypemeal.onrender.com/

Должно вернуть:
```json
{
  "message": "SwypeMeal API v2.0",
  "status": "running",
  "storage": "PostgreSQL (Supabase)"
}
```

✅ **Если видите `"storage": "PostgreSQL (Supabase)"` — всё работает!**

---

## 🔍 Проверка данных в Supabase

### Через Table Editor

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/table-editor)
2. Выберите таблицу (например, `recipes`)
3. Вы увидите 12 начальных рецептов

### Через SQL Editor

```sql
-- Проверить количество пользователей
SELECT COUNT(*) FROM users;

-- Проверить очередь пользователя
SELECT * FROM queue_items WHERE user_id = 'your-user-id';

-- Проверить историю
SELECT h.cooked_at, r.title, h.rating, h.notes
FROM history_items h
JOIN recipes r ON h.recipe_id = r.id
ORDER BY h.cooked_at DESC
LIMIT 10;

-- Статистика по пользователям
SELECT 
    u.id,
    COUNT(DISTINCT qi.id) as queue_items,
    COUNT(DISTINCT hi.id) as cooked_meals
FROM users u
LEFT JOIN queue_items qi ON u.id = qi.user_id
LEFT JOIN history_items hi ON u.id = hi.user_id
GROUP BY u.id;
```

---

## 🧪 Тестирование API

### Проверка здоровья БД

```bash
curl https://swypemeal.onrender.com/api/health
```

Должно вернуть:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Тестовые запросы

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

## 🔄 Включение синхронизации на Frontend

После подключения БД:

1. Откройте https://swype-meal3.vercel.app/
2. Перейдите в **Настройки** (вкладка "Фильтры")
3. Включите переключатель **Синхронизация**
4. Данные будут синхронизироваться между устройствами

**Индикаторы статуса:**
- 🟢 **Онлайн** — синхронизация активна
- 🟡 **Оффлайн** — backend недоступен
- ⚫ **Локально** — синхронизация отключена

---

## 🐛 Troubleshooting

### Backend показывает "File Storage"

**Причина:** Переменные окружения не настроены

**Решение:**
1. Проверьте, что `DATABASE_URL` и `USE_DATABASE=true` добавлены
2. Перезапустите backend на Render (Manual Deploy → Deploy latest commit)

### Ошибка подключения к БД

**Причина:** Неправильный connection string или пароль

**Решение:**
1. Проверьте `DATABASE_URL` в переменных окружения
2. Убедитесь, что пароль правильный (без пробелов)
3. Проверьте логи на Render для деталей

### Таблицы не созданы

**Причина:** SQL скрипт не выполнен

**Решение:**
1. Выполните `backend/init_db.sql` в Supabase SQL Editor
2. Проверьте, что все 6 таблиц созданы

### Данные не синхронизируются

**Причина:** Синхронизация отключена на frontend

**Решение:**
1. Откройте настройки на frontend
2. Включите переключатель "Синхронизация"
3. Нажмите "Обновить" для принудительной синхронизации

---

## 📊 Мониторинг

### Логи backend на Render

1. Откройте Render Dashboard
2. Выберите backend сервис
3. Вкладка **Logs**
4. Вы увидите:
   - `✓ Database connected: db.bbelyefgpptozjfmeyqq.supabase.co`
   - Все API запросы
   - Ошибки (если есть)

### Использование Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq)
2. **Reports** → **Database**
3. Вы увидите:
   - Размер БД
   - Количество подключений
   - Query performance

---

## 💰 Стоимость Supabase Free Tier

✅ 500 MB database size  
✅ 2 GB bandwidth  
✅ 50,000 monthly active users  
✅ Community support  

**Ограничения:**
- Проект приостанавливается после 7 дней неактивности
- Нужно вручную возобновлять в Dashboard

**Для production:** Pro tier ($25/мес)
- 8 GB database
- Daily backups
- No pausing

---

## 🔐 Безопасность

### ⚠️ Важно: Смените пароль!

Вы отправили пароль в открытом виде. **Обязательно смените его:**

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/settings/database)
2. **Database Password** → **Reset**
3. Установите новый сложный пароль
4. Обновите `DATABASE_URL` в переменных окружения на Render
5. Перезапустите backend

### Рекомендации

- ✅ Используйте сложные пароли (16+ символов)
- ✅ Не коммитьте `.env` файлы в Git
- ✅ Используйте переменные окружения для secrets
- ✅ Включите 2FA для Supabase аккаунта

---

## 📁 Что изменилось

### Backend (`backend/main.py`)

✅ Поддержка PostgreSQL через SQLAlchemy  
✅ Автоматический fallback на file storage при ошибке БД  
✅ SSL подключение к Supabase  
✅ Connection pooling для производительности  
✅ Все 12 рецептов в базе  
✅ Health check endpoint (`/api/health`)

### Frontend

✅ API клиент (`src/api.ts`)  
✅ Синхронизация данных с backend  
✅ Индикатор статуса подключения  
✅ Переключатель синхронизации в настройках

---

## 🎯 Следующие шаги

После успешного подключения:

1. ✅ Протестируйте все функции (свайп, очередь, история)
2. ✅ Проверьте синхронизацию между устройствами
3. ✅ Добавьте больше рецептов через SQL
4. ✅ Настройте мониторинг и алерты
5. ✅ Создайте Telegram бота

---

## 📚 Документация

- **[DATABASE.md](DATABASE.md)** — полная документация по БД
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** — детальная инструкция
- **[DEPLOY_RENDER.md](DEPLOY_RENDER.md)** — деплой на Render
- **API Docs:** https://swypemeal.onrender.com/docs

---

## ✅ Чеклист

- [ ] SQL скрипт выполнен в Supabase
- [ ] Переменные `DATABASE_URL` и `USE_DATABASE=true` добавлены на Render
- [ ] Backend перезапущен
- [ ] Проверка `/` возвращает `"storage": "PostgreSQL (Supabase)"`
- [ ] Проверка `/api/health` возвращает `"database": "connected"`
- [ ] Пароль в Supabase изменён
- [ ] Синхронизация включена на frontend
- [ ] Данные синхронизируются между устройствами

---

**Готово! Ваша Supabase БД подключена к SwypeMeal!** 🎉

Если возникли проблемы — проверьте логи на Render и убедитесь, что все переменные окружения настроены правильно.
