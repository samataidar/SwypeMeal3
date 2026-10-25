# 🔧 Исправление: No module named 'psycopg'

## ❌ Проблема

Из логов Render:
```
✗ Database connection failed: No module named 'psycopg'
  Falling back to file storage
```

**Причина:** Не установлен драйвер PostgreSQL для Python.

---

## ✅ Решение

### Шаг 1: Закоммитьте изменения

```bash
git add backend/requirements.txt backend/main.py
git commit -m "fix: Add psycopg2-binary driver for PostgreSQL"
git push origin main
```

### Шаг 2: Дождитесь деплоя на Render

Render автоматически:
1. Переустановит зависимости (включая `psycopg2-binary`)
2. Перезапустит backend
3. Подключится к Supabase

### Шаг 3: Проверьте логи

В логах Render должно быть:
```
[DEBUG] DATABASE_URL: SET
[DEBUG] USE_DATABASE env: true
[DEBUG] USE_DATABASE final: True
[DEBUG] Connecting to database...
[DEBUG] Database URL: postgresql+psycopg2://postgres:***
✓ Database connected successfully: db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
```

### Шаг 4: Проверьте API

```bash
curl https://swypemeal.onrender.com/api/health
```

**Должно вернуть:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 📦 Что изменилось

### backend/requirements.txt
✅ Добавлен `psycopg2-binary>=2.9.9` — драйвер PostgreSQL

### backend/main.py
✅ Автоматически добавляет `+psycopg2` к connection string
✅ Улучшенное логирование ошибок
✅ Показывает traceback при ошибке подключения

---

## 🐛 Если всё ещё не работает

### Проверьте установку psycopg2

В логах Render найдите строку:
```
Successfully installed psycopg2-binary-2.9.9
```

Если её нет — зависимости не установились. Попробуйте:
1. Manual Deploy → Deploy latest commit
2. Или очистите кэш: Settings → Clear build cache

### Проверьте connection string

Убедитесь, что `DATABASE_URL` правильный:
```
postgresql://postgres:Фф13524690!!@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
```

Код автоматически преобразует его в:
```
postgresql+psycopg2://postgres:Фф13524690!!@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres?sslmode=require
```

---

## ✅ Чеклист

- [ ] Закоммитили `backend/requirements.txt`
- [ ] Закоммитили `backend/main.py`
- [ ] Запушили в main
- [ ] Дождались деплоя на Render
- [ ] В логах видно `✓ Database connected successfully`
- [ ] API возвращает `"database": "connected"`

---

**После пуша изменений Render автоматически установит psycopg2-binary и подключится к Supabase!** 🚀
