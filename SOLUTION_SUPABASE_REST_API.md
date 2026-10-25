# 🎯 Решение: Supabase REST API (Бесплатно, работает через IPv4)

## Проблема

Render Free Tier блокирует IPv6, а Supabase Free Tier не поддерживает IPv4 (это платная функция Pro плана $25/мес).

## Решение

Используем **Supabase REST API** вместо прямого подключения к PostgreSQL. Это:
- ✅ **Бесплатно** (входит в Free tier)
- ✅ **Работает через HTTPS** (IPv4)
- ✅ **Не требует смены хостинга**
- ✅ **Использует вашу существующую БД Supabase**

---

## 📋 Пошаговая инструкция

### Шаг 1: Получите API ключи из Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq)
2. Перейдите в **Settings** → **API**
3. Найдите раздел **Project API keys**

Вам нужны два значения:

**SUPABASE_URL:**
```
https://bbelyefgpptozjfmeyqq.supabase.co
```

**SUPABASE_KEY (anon public):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (длинная строка)
```

⚠️ **Важно:** Используйте **anon public** ключ, НЕ service_role ключ!

---

### Шаг 2: Добавьте переменные окружения на Render

1. Откройте [Render Dashboard](https://dashboard.render.com)
2. Выберите ваш backend сервис
3. Перейдите в **Environment**
4. Удалите старые переменные:
   - ❌ `DATABASE_URL` (больше не нужна)
   - ❌ `USE_DATABASE` (больше не нужна)

5. Добавьте новые переменные:

**Переменная 1:**
| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://bbelyefgpptozjfmeyqq.supabase.co` |

**Переменная 2:**
| Key | Value |
|-----|-------|
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (ваш anon key) |

**Переменная 3:**
| Key | Value |
|-----|-------|
| `USE_SUPABASE` | `true` |

6. Нажмите **Save Changes**

---

### Шаг 3: Закоммитьте изменения

```bash
git add backend/requirements.txt backend/main.py
git commit -m "feat: Use Supabase REST API instead of direct PostgreSQL"
git push origin main
```

Render автоматически переустановит зависимости и перезапустит backend.

---

### Шаг 4: Проверьте логи

В логах Render должно быть:

```
[DEBUG] SUPABASE_URL: SET
[DEBUG] SUPABASE_KEY: SET
[DEBUG] USE_SUPABASE: true
[DEBUG] Connecting to Supabase via REST API...
✓ Supabase connected successfully via REST API
```

---

### Шаг 5: Проверьте API

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

И проверьте root:
```bash
curl https://swypemeal.onrender.com/
```

**Должно вернуть:**
```json
{
  "message": "SwypeMeal API v2.0",
  "status": "running",
  "storage": "Supabase REST API"
}
```

---

## 🔍 Как это работает

### Старый способ (не работает на Render Free):
```
Backend → PostgreSQL (прямое подключение через port 5432)
         ❌ Блокируется Render (IPv6)
```

### Новый способ (работает):
```
Backend → Supabase REST API → PostgreSQL
         ✅ Через HTTPS (IPv4)
```

Supabase автоматически предоставляет REST API для всех ваших таблиц через PostgREST. Мы используем Python клиент `supabase-py`, который обращается к этому API.

---

## 📊 Что изменилось в коде

### backend/requirements.txt
```diff
- psycopg2-binary>=2.9.9
+ supabase>=2.0.0
```

### backend/main.py
```diff
- from sqlalchemy import create_engine
+ from supabase import create_client, Client

- db_engine = create_engine(DATABASE_URL)
+ supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

- conn.execute(text("SELECT * FROM recipes"))
+ supabase_client.table('recipes').select('*').execute()
```

Все SQL запросы заменены на вызовы Supabase REST API.

---

## ✅ Преимущества этого решения

1. **Бесплатно** — не нужно платить за IPv4 в Supabase
2. **Безопасно** — используется anon key с ограничениями
3. **Быстро** — REST API кэшируется на стороне Supabase
4. **Надёжно** — HTTPS работает везде, даже через прокси
5. **Просто** — не нужно менять хостинг или настраивать сеть

---

## 🐛 Troubleshooting

### Ошибка: "Invalid API key"

**Причина:** Неправильный SUPABASE_KEY

**Решение:**
1. Убедитесь, что используете **anon public** ключ
2. Скопируйте ключ полностью (без пробелов)
3. Проверьте, что нет переносов строк

---

### Ошибка: "relation does not exist"

**Причина:** Таблицы не созданы в Supabase

**Решение:**
1. Откройте [Supabase SQL Editor](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/sql)
2. Выполните код из `backend/init_db.sql`
3. Проверьте, что создано 6 таблиц

---

### Ошибка: "permission denied"

**Причина:** Anon key не имеет доступа к таблицам

**Решение:**
1. Откройте **Table Editor** в Supabase
2. Для каждой таблицы проверьте **Policies**
3. Убедитесь, что есть policy для `anon` role:
   ```sql
   CREATE POLICY "Enable all for anon" ON recipes
   FOR ALL TO anon
   USING (true)
   WITH CHECK (true);
   ```

Или выполните в SQL Editor:
```sql
-- Разрешить anon доступ ко всем таблицам
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
```

---

### Backend показывает "file_storage"

**Причина:** Переменные окружения не добавлены

**Решение:**
1. Проверьте, что все 3 переменные добавлены на Render:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `USE_SUPABASE=true`
2. Перезапустите backend (Manual Deploy)

---

## 📋 Чеклист

- [ ] Получили SUPABASE_URL из Settings → API
- [ ] Получили SUPABASE_KEY (anon public) из Settings → API
- [ ] Добавили все 3 переменные на Render
- [ ] Удалили старые переменные (DATABASE_URL, USE_DATABASE)
- [ ] Закоммитили изменения
- [ ] Запушили в main
- [ ] Дождались деплоя на Render
- [ ] В логах видно `✓ Supabase connected successfully`
- [ ] API возвращает `"storage": "Supabase REST API"`
- [ ] Health endpoint возвращает `"database": "connected"`

---

## 🎯 Быстрая проверка

После добавления переменных и деплоя:

```bash
# Проверка root
curl https://swypemeal.onrender.com/
# Ожидаемый результат:
# {"message":"SwypeMeal API v2.0","status":"running","storage":"Supabase REST API"}

# Проверка health
curl https://swypemeal.onrender.com/api/health
# Ожидаемый результат:
# {"status":"healthy","database":"connected"}

# Проверка рецептов
curl "https://swypemeal.onrender.com/api/recipes?user_id=test"
# Должно вернуть список рецептов
```

---

## 💡 Альтернативные решения

Если Supabase REST API не подходит, есть другие варианты:

### Вариант 1: Переехать на Railway
- Railway поддерживает IPv6
- Бесплатный tier: $5 кредитов/месяц
- URL: https://railway.app

### Вариант 2: Использовать Neon.tech
- Бесплатный PostgreSQL с IPv4
- URL: https://neon.tech
- 0.5 GB storage бесплатно

### Вариант 3: VPS с Docker
- Арендовать VPS ($5/мес)
- Развернуть PostgreSQL в Docker
- Полный контроль над сетью

Но **Supabase REST API — самое простое и бесплатное решение!** 🚀

---

## 📚 Документация

- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
- [Supabase REST API](https://supabase.com/docs/guides/api)
- [Render Environment Variables](https://render.com/docs/environment-variables)

---

**Используйте Supabase REST API — это бесплатно и работает через IPv4!** 🎉
