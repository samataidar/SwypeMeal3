# 🔧 Исправление проблем с RLS и дубликатами

## 📋 Проблемы

### 1. Бесконечная рекурсия в RLS
**Ошибка:**
```
infinite recursion detected in policy for relation "user_roles"
```

**Причина:**
Политика "Admins can view all roles" проверяет `EXISTS (SELECT 1 FROM user_roles WHERE ...)`, что снова вызывает проверку RLS для той же таблицы `user_roles`, создавая бесконечный цикл.

### 2. Дубликаты в queue_items
**Ошибка:**
```
duplicate key value violates unique constraint "queue_items_pkey"
```

**Причина:**
Backend пытается вставить запись с ID, который уже существует в базе данных.

---

## ✅ Решение

### Шаг 1: Выполните SQL скрипт в Supabase

Откройте [Supabase SQL Editor](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/sql) и выполните код из файла `backend/fix_rls_and_duplicates.sql`.

**Что делает скрипт:**

1. **Отключает RLS** для `user_roles` и `pending_recipes`
   - Это безопасно, так как backend использует service_role key
   - Убирает бесконечную рекурсию

2. **Создаёт функции для upsert**
   - `upsert_queue_item()` - для queue_items
   - `upsert_history_item()` - для history_items

3. **Удаляет дубликаты** из всех таблиц
   - queue_items
   - history_items
   - swiped_recipes

4. **Проверяет** что всё настроено правильно

---

### Шаг 2: Закоммитьте и запушьте изменения

```bash
git add backend/main.py backend/fix_rls_and_duplicates.sql
git commit -m "fix: Use upsert instead of insert to avoid duplicate key errors"
git push origin main
```

Render автоматически задеплоит новую версию.

---

### Шаг 3: Проверьте логи

После деплоя в логах **НЕ должно быть**:
- ❌ `infinite recursion detected in policy for relation "user_roles"`
- ❌ `duplicate key value violates unique constraint "queue_items_pkey"`

**Должно быть:**
- ✅ `✓ Supabase connected successfully via REST API`
- ✅ Все API запросы возвращают 200 OK без ошибок

---

## 🔍 Что изменилось в коде

### Backend (main.py)

**Было (insert):**
```python
supabase.insert("queue_items", {
    "id": item["id"],
    "user_id": user_id,
    "recipe_id": recipe["id"],
    "position": i,
    "added_at": item.get("added_at")
})
```

**Стало (upsert):**
```python
supabase.upsert("queue_items", {
    "id": item["id"],
    "user_id": user_id,
    "recipe_id": recipe["id"],
    "position": i,
    "added_at": item.get("added_at")
}, on_conflict="id")
```

**Преимущества:**
- ✅ Если запись уже существует → обновляется
- ✅ Если записи нет → создаётся
- ✅ Нет ошибок дубликатов

### SupabaseClient.upsert()

**Было:**
```python
def upsert(self, table: str,  dict, on_conflict: str = None) -> dict:
    headers = {**self.headers, "Prefer": "return=representation,resolution=merge-duplicates"}
    if on_conflict:
        headers["on_conflict"] = on_conflict  # ❌ Неправильно: должно быть в params
    url = f"{self.rest_url}/{table}"
    with httpx.Client(timeout=10.0) as client:
        response = client.post(url, headers=headers, json=data)
```

**Стало:**
```python
def upsert(self, table: str, data: dict, on_conflict: str = None) -> dict:
    headers = {**self.headers, "Prefer": "return=representation,resolution=merge-duplicates"}
    params = {}
    if on_conflict:
        params["on_conflict"] = on_conflict  # ✅ Правильно: в query params
    url = f"{self.rest_url}/{table}"
    with httpx.Client(timeout=10.0) as client:
        response = client.post(url, headers=headers, params=params, json=data)
```

---

## 📊 Проверка в Supabase

### Проверьте что RLS отключён

```sql
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('user_roles', 'pending_recipes')
ORDER BY tablename;
```

**Ожидаемый результат:**
```
tablename         | rowsecurity
------------------|------------
pending_recipes   | false
user_roles        | false
```

### Проверьте что функции созданы

```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN ('upsert_queue_item', 'upsert_history_item')
ORDER BY proname;
```

**Ожидаемый результат:**
```
proname
------------------
upsert_history_item
upsert_queue_item
```

### Проверьте что нет дубликатов

```sql
-- Проверка дубликатов в queue_items
SELECT id, COUNT(*) 
FROM queue_items 
GROUP BY id 
HAVING COUNT(*) > 1;

-- Должно вернуть 0 строк
```

---

## 🐛 Troubleshooting

### Ошибка всё ещё появляется после выполнения SQL

**Решение:**
1. Убедитесь что SQL скрипт выполнен полностью
2. Проверьте что RLS отключён (см. проверку выше)
3. Перезапустите backend на Render (Manual Deploy)

### Ошибка "permission denied" после отключения RLS

**Причина:** Backend использует anon key вместо service_role key

**Решение:**
Убедитесь что в переменных окружения на Render:
```
SUPABASE_KEY=eyJhbGc...  # Это должен быть service_role key, НЕ anon key
```

**Где найти service_role key:**
1. Откройте Supabase Dashboard
2. Settings → API
3. Скопируйте **service_role** key (секретный, не публичный!)

⚠️ **Важно:** service_role key даёт полный доступ к БД. Никогда не публикуйте его в frontend!

### Дубликаты всё ещё появляются

**Решение:**
1. Выполните SQL скрипт заново (он удалит дубликаты)
2. Убедитесь что backend использует upsert (проверьте код)
3. Проверьте логи на наличие ошибок

---

## 📋 Чеклист

- [ ] Выполнен SQL скрипт `backend/fix_rls_and_duplicates.sql`
- [ ] RLS отключён для `user_roles` и `pending_recipes`
- [ ] Функции `upsert_queue_item` и `upsert_history_item` созданы
- [ ] Дубликаты удалены из таблиц
- [ ] Backend обновлён (использует upsert вместо insert)
- [ ] Закоммичены и запушены изменения
- [ ] Backend перезапущен на Render
- [ ] В логах нет ошибок `infinite recursion`
- [ ] В логах нет ошибок `duplicate key`
- [ ] Все API запросы работают корректно

---

## 🎯 Итоговое решение

### Проблема 1: Бесконечная рекурсия в RLS
**Решение:** Отключить RLS для `user_roles` и `pending_recipes`
```sql
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE pending_recipes DISABLE ROW LEVEL SECURITY;
```

### Проблема 2: Дубликаты в queue_items
**Решение:** Использовать upsert вместо insert
```python
supabase.upsert("queue_items", {...}, on_conflict="id")
```

### Проблема 3: Неправильный параметр on_conflict
**Решение:** Передавать on_conflict в query params, не в headers
```python
params = {"on_conflict": on_conflict}
response = client.post(url, headers=headers, params=params, json=data)
```

---

## 📚 Документация

- **[ROLES_SETUP.md](ROLES_SETUP.md)** — настройка системы ролей
- **[AUTH_SETUP.md](AUTH_SETUP.md)** — настройка аутентификации
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** — подключение Supabase

---

**После выполнения всех шагов проблемы с RLS и дубликатами будут решены!** 🎉
