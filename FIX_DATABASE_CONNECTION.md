# 🔧 Исправление: Backend не подключается к Supabase

## ❌ Проблема

Backend возвращает:
```json
{"status":"healthy","database":"file_storage"}
```

Вместо:
```json
{"status":"healthy","database":"connected"}
```

## 🔍 Причина

Переменные окружения `DATABASE_URL` и `USE_DATABASE` **не добавлены** на Render.

---

## ✅ Решение (пошаговая инструкция)

### Шаг 1: Откройте Render Dashboard

1. Перейдите на https://dashboard.render.com
2. Войдите в аккаунт
3. Найдите ваш backend сервис (swypemeal-backend или подобное)

---

### Шаг 2: Добавьте переменные окружения

1. Кликните на ваш backend сервис
2. В левом меню найдите **Environment**
3. Нажмите **Add Environment Variable**

#### Добавьте первую переменную:

**Key:**
```
DATABASE_URL
```

**Value:**
```
postgresql://postgres:Фф13524690!!@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
```

⚠️ **Важно:** Убедитесь, что пароль правильный! Если меняли пароль в Supabase — используйте новый.

Нажмите **Add Environment Variable**

---

#### Добавьте вторую переменную:

**Key:**
```
USE_DATABASE
```

**Value:**
```
true
```

Нажмите **Add Environment Variable**

---

### Шаг 3: Проверьте переменные

В разделе **Environment** вы должны увидеть:

```
DATABASE_URL = postgresql://postgres:***@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
USE_DATABASE = true
```

✅ Если видите обе переменные — переходите к шагу 4.

---

### Шаг 4: Перезапустите backend

После добавления переменных Render **автоматически** перезапустит сервис.

Но если не перезапустился:

1. Перейдите в **Manual Deploy**
2. Нажмите **Deploy latest commit**
3. Подождите 1-2 минуты пока деплой завершится

---

### Шаг 5: Проверьте логи

1. В Render Dashboard откройте ваш backend сервис
2. Перейдите в вкладку **Logs**
3. Найдите строки при старте:

**Должно быть:**
```
[DEBUG] DATABASE_URL: SET
[DEBUG] USE_DATABASE env: true
[DEBUG] USE_DATABASE final: true
[DEBUG] Connecting to database...
✓ Database connected successfully: db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
```

**Если видите:**
```
[DEBUG] DATABASE_URL: NOT SET
[DEBUG] USE_DATABASE env: false
⚠ Database mode disabled, using file storage
```

→ Переменные не добавлены! Вернитесь к шагу 2.

---

### Шаг 6: Проверьте API

Откройте в браузере:

```
https://swypemeal.onrender.com/
```

**Должно вернуть:**
```json
{
  "message": "SwypeMeal API v2.0",
  "status": "running",
  "storage": "PostgreSQL (Supabase)"
}
```

✅ **Если видите `"storage": "PostgreSQL (Supabase)"` — всё работает!**

---

### Шаг 7: Проверьте health endpoint

Откройте:

```
https://swypemeal.onrender.com/api/health
```

**Должно вернуть:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

✅ **Если видите `"database": "connected"` — БД подключена!**

---

## 🐛 Troubleshooting

### Проблема: Переменные не сохраняются

**Решение:**
1. Убедитесь, что нажали **Save Changes** после добавления переменных
2. Проверьте, что нет пробелов в начале/конце значений
3. Перезапустите backend вручную (Manual Deploy)

---

### Проблема: Ошибка подключения к БД

**Симптом:** В логах видите:
```
✗ Database connection failed: could not connect to server
```

**Решение:**
1. Проверьте пароль в `DATABASE_URL`
2. Убедитесь, что БД не приостановлена (Supabase Free tier)
3. Проверьте, что таблицы созданы (выполните `init_db.sql`)

**Как проверить БД:**
1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq)
2. Перейдите в **Database** → **Connections**
3. Проверьте статус

---

### Проблема: Таблицы не созданы

**Симптом:** Ошибки типа `relation "users" does not exist`

**Решение:**
1. Откройте [Supabase SQL Editor](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/sql)
2. Скопируйте код из `backend/init_db.sql`
3. Вставьте и нажмите **Run**
4. Проверьте, что создано 6 таблиц

---

### Проблема: Backend показывает старую версию

**Симптом:** Возвращает `"message":"SwypeMeal API v1.0"` вместо `v2.0`

**Решение:**
1. Убедитесь, что запушили последние изменения:
   ```bash
   git add .
   git commit -m "fix: Add database logging"
   git push origin main
   ```
2. Дождитесь автоматического деплоя на Render
3. Или запустите Manual Deploy

---

## 📋 Чеклист

Перед тем как писать "не работает", проверьте:

- [ ] Переменная `DATABASE_URL` добавлена на Render
- [ ] Переменная `USE_DATABASE=true` добавлена на Render
- [ ] Backend перезапущен (Manual Deploy)
- [ ] В логах видно `✓ Database connected successfully`
- [ ] API возвращает `"storage": "PostgreSQL (Supabase)"`
- [ ] Health endpoint возвращает `"database": "connected"`
- [ ] Таблицы созданы в Supabase (выполнен `init_db.sql`)
- [ ] Пароль в `DATABASE_URL` правильный

---

## 🎯 Быстрая проверка

Выполните эти команды в терминале:

```bash
# Проверка root endpoint
curl https://swypemeal.onrender.com/

# Проверка health endpoint
curl https://swypemeal.onrender.com/api/health

# Проверка рецептов
curl "https://swypemeal.onrender.com/api/recipes?user_id=test"
```

**Ожидаемый результат:**
```json
{"message":"SwypeMeal API v2.0","status":"running","storage":"PostgreSQL (Supabase)"}
```

---

## 📞 Если ничего не помогло

1. Проверьте логи на Render (вкладка Logs)
2. Скопируйте все строки с `[DEBUG]` и ошибки
3. Проверьте переменные окружения ещё раз
4. Убедитесь, что Supabase БД активна (не paused)

---

**После выполнения всех шагов backend должен подключиться к Supabase PostgreSQL!** 🚀
