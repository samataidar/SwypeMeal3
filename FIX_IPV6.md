# 🔧 Исправление: Network is unreachable (IPv6 проблема)

## ❌ Проблема

Из логов Render:
```
connection to server at "db.bbelyefgpptozjfmeyqq.supabase.co" 
(2a05:d01c:1b7:9301:661:6d89:dff4:455), port 5432 failed: 
Network is unreachable
```

**Причина:** Render Free Tier блокирует IPv6, а Supabase пытается подключиться через IPv6 адрес.

---

## ✅ Решение 1: Использовать IPv4 хост (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Получите IPv4 connection string

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/settings/database)
2. **Settings** → **Database** → **Connection string**
3. Выберите вкладку **URI**
4. Найдите переключатель **Network** → выберите **IPv4**

Вы увидите хост вида:
```
ipv4.bbelyefgpptozjfmeyqq.supabase.co
```

Вместо:
```
db.bbelyefgpptozjfmeyqq.supabase.co
```

### Шаг 2: Обновите переменную на Render

1. Откройте [Render Dashboard](https://dashboard.render.com)
2. Backend сервис → **Environment**
3. Измените `DATABASE_URL`:

**Было:**
```
postgresql://postgres:Фф13524690!!@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
```

**Станет:**
```
postgresql://postgres:Фф13524690!!@ipv4.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
```

4. **Save Changes**

### Шаг 3: Проверьте

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

## ✅ Решение 2: Использовать psycopg (v3)

Я обновил код для использования `psycopg` (v3) вместо `psycopg2`. Этот драйвер лучше работает с современными сетями.

### Закоммитьте изменения:

```bash
git add backend/requirements.txt backend/main.py
git commit -m "fix: Use psycopg v3 for better network handling"
git push origin main
```

Render автоматически переустановит зависимости и перезапустит backend.

---

## 🐛 Если оба решения не помогли

### Вариант A: Используйте IP-адрес напрямую

1. Определите IPv4 адрес Supabase:
```bash
# На Linux/Mac
dig +short ipv4.bbelyefgpptozjfmeyqq.supabase.co

# Или
nslookup ipv4.bbelyefgpptozjfmeyqq.supabase.co
```

2. Используйте IP в connection string:
```
postgresql://postgres:Фф13524690!!@<IP-АДРЕС>:5432/postgres?sslmode=require
```

### Вариант B: Проверьте Supabase

1. Убедитесь, что БД не приостановлена (Supabase Free tier)
2. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq)
3. Проверьте статус проекта

### Вариант C: Проверьте firewall

Если используете корпоративную сеть, возможно блокируется порт 5432.

---

## 📋 Чеклист

- [ ] Получили IPv4 connection string из Supabase
- [ ] Обновили `DATABASE_URL` на Render (используя `ipv4.bbelyefgpptozjfmeyqq.supabase.co`)
- [ ] Закоммитили изменения (`psycopg` v3)
- [ ] Запушили в main
- [ ] Дождались деплоя на Render
- [ ] В логах видно `✓ Database connected successfully`
- [ ] API возвращает `"database": "connected"`

---

## 🎯 Быстрая проверка

После обновления `DATABASE_URL` на IPv4 хост:

```bash
# Проверка health
curl https://swypemeal.onrender.com/api/health

# Ожидаемый результат:
# {"status":"healthy","database":"connected"}
```

---

**Используйте IPv4 хост из Supabase — это самое надёжное решение!** 🚀
