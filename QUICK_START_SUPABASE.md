# ⚡ Быстрое подключение Supabase (5 минут)

## Что у вас есть
✅ Supabase БД: `https://bbelyefgpptozjfmeyqq.supabase.co`  
✅ Файлы для инициализации готовы

---

## 🚀 3 шага для подключения

### Шаг 1: Создайте таблицы (2 минуты)

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/sql)
2. Нажмите **New Query**
3. Скопируйте весь код из `backend/init_db.sql`
4. Вставьте и нажмите **Run**

✅ Готово! Таблицы созданы.

---

### Шаг 2: Получите Connection String (1 минута)

1. Перейдите в **Settings** → **Database**
2. Найдите **Connection string** → **URI**
3. Скопируйте строку:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
   ```
4. Замените `[YOUR-PASSWORD]` на ваш пароль (в разделе Database Password)

---

### Шаг 3: Добавьте переменные на Render (2 минуты)

1. Откройте [Render Dashboard](https://dashboard.render.com)
2. Выберите ваш backend сервис
3. Перейдите в **Environment**
4. Добавьте:

```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.bbelyefgpptozjfmeyqq.supabase.co:5432/postgres
USE_DATABASE=true
```

5. Нажмите **Save Changes**

✅ Render автоматически перезапустит backend.

---

## ✅ Проверка

Откройте: https://swypemeal.onrender.com/

Должно вернуть:
```json
{
  "message": "SwypeMeal API v2.0",
  "status": "running",
  "storage": "PostgreSQL"
}
```

**Если видите `"storage": "PostgreSQL"` — всё работает!** 🎉

---

## 🔧 Если что-то пошло не так

### Ошибка подключения
- Проверьте пароль в `DATABASE_URL`
- Убедитесь, что БД не приостановлена (Supabase Free tier)

### Таблицы не созданы
- Выполните `init_db.sql` заново в SQL Editor

### Backend показывает "File Storage"
- Проверьте, что `USE_DATABASE=true` добавлен
- Перезапустите backend вручную на Render

---

## 📚 Подробная документация

- Полная инструкция: [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
- Документация по БД: [DATABASE.md](DATABASE.md)

---

**Готово! Ваша БД подключена!** 🚀
