# 🔐 Настройка системы ролей и модерации

## 📋 Что было добавлено

### Backend
- ✅ Таблица `user_roles` для хранения ролей пользователей
- ✅ Таблица `pending_recipes` для рецептов на модерации
- ✅ Функции для проверки ролей (`get_user_role`, `is_user_admin`)
- ✅ Функции для модерации (`approve_recipe`, `reject_recipe`)
- ✅ API endpoints для администраторов

### Frontend
- ✅ Компонент `AdminPanel` для модерации рецептов
- ✅ Вкладка "Админ" в навигации (только для администраторов)
- ✅ Обновлён `AddRecipe` для отправки на модерацию
- ✅ Обновлён `AuthContext` для хранения роли пользователя

---

## 🚀 Настройка (10 минут)

### Шаг 1: Выполните SQL в Supabase

Откройте [Supabase SQL Editor](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/sql) и выполните код из файла `backend/add_roles.sql`.

Это создаст:
- Таблицу `user_roles` для хранения ролей
- Таблицу `pending_recipes` для рецептов на модерации
- Функции для проверки ролей и модерации
- Индексы для быстрого поиска

---

### Шаг 2: Назначьте себя администратором

В том же SQL Editor выполните:

```sql
-- Замените YOUR_USER_ID на ваш реальный user_id из Supabase Auth
-- Найти можно в Authentication → Users → ваш email → UUID

INSERT INTO user_roles (user_id, role) 
VALUES ('YOUR_USER_ID', 'admin');
```

**Как найти ваш user_id:**
1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/auth/users)
2. Перейдите в **Authentication** → **Users**
3. Найдите свой email
4. Скопируйте **UID** (например: `123e4567-e89b-12d3-a456-426614174000`)
5. Вставьте в SQL запрос

---

### Шаг 3: Настройте Row Level Security (RLS)

Для защиты данных выполните в SQL Editor:

```sql
-- Включить RLS для таблиц
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_recipes ENABLE ROW LEVEL SECURITY;

-- Политики для user_roles
CREATE POLICY "Users can view their own role"
ON user_roles FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

-- Политики для pending_recipes
CREATE POLICY "Users can submit recipes"
ON pending_recipes FOR INSERT
WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY "Users can view their own pending recipes"
ON pending_recipes FOR SELECT
USING (auth.uid()::text = author_id);

CREATE POLICY "Admins can view all pending recipes"
ON pending_recipes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

CREATE POLICY "Admins can update pending recipes"
ON pending_recipes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);
```

---

### Шаг 4: Закоммитьте и запушьте изменения

```bash
git add .
git commit -m "feat: Add user roles and recipe moderation system"
git push origin main
```

Vercel и Render автоматически задеплоят новые версии.

---

## ✅ Проверка

### 1. Проверьте роль пользователя

Откройте консоль браузера на https://swype-meal3.vercel.app/ и выполните:

```javascript
// Проверьте роль в localStorage
console.log(localStorage.getItem('swypemeal_user_id'));
```

### 2. Проверьте админ-панель

1. Войдите в приложение
2. В навигации должна появиться вкладка **"Админ"** (только для администраторов)
3. Нажмите на неё → откроется панель модерации

### 3. Проверьте отправку рецепта на модерацию

1. Перейдите во вкладку **"Добавить"**
2. Заполните форму и отправьте рецепт
3. Должно появиться сообщение: "Рецепт отправлен на модерацию"
4. Перейдите в **"Админ"** → рецепт должен появиться в списке

### 4. Проверьте модерацию

1. В админ-панели нажмите **"Одобрить"** или **"Отклонить"**
2. Рецепт должен исчезнуть из списка
3. Если одобрен → появится в общем списке рецептов

---

## 🎨 Как это работает

### Архитектура

```
┌──────────────┐
│   Frontend   │
│   (Vercel)   │
│              │
│  AdminPanel  │ ← Панель модерации (только для админов)
│  AddRecipe   │ ← Отправка на модерацию
│  AuthContext │ ← Хранение роли пользователя
└──────┬───────┘
       │
       │ API calls
       │
┌──────▼───────┐
│   Backend    │
│   (Render)   │
│              │
│  /api/recipes/pending    ← Список на модерацию
│  /api/recipes/{id}/approve ← Одобрить
│  /api/recipes/{id}/reject  ← Отклонить
│  /api/user/role/{id}       ← Получить роль
└──────┬───────┘
       │
       │ Supabase REST API
       │
┌──────▼───────┐
│   Supabase   │
│              │
│  user_roles         ← Роли пользователей
│  pending_recipes    ← Рецепты на модерации
│  recipes            ← Одобрённые рецепты
└──────────────┘
```

### Поток модерации

1. **Пользователь отправляет рецепт:**
   - Заполняет форму в AddRecipe
   - Рецепт сохраняется в `pending_recipes` со статусом `pending`

2. **Администратор видит рецепт:**
   - Открывает AdminPanel
   - Загружает список рецептов со статусом `pending`

3. **Администратор принимает решение:**
   - **Одобрить:** рецепт копируется в `recipes`, статус меняется на `approved`
   - **Отклонить:** статус меняется на `rejected`, можно добавить комментарий

4. **Одобренный рецепт становится доступным:**
   - Появляется в общем списке рецептов
   - Все пользователи могут его видеть и использовать

---

## 📊 Структура данных

### Таблица user_roles

```sql
CREATE TABLE user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Таблица pending_recipes

```sql
CREATE TABLE pending_recipes (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    cook_time INTEGER NOT NULL,
    servings INTEGER NOT NULL,
    calories INTEGER NOT NULL,
    protein DECIMAL NOT NULL,
    fat DECIMAL NOT NULL,
    carbs DECIMAL NOT NULL,
    ingredients JSONB NOT NULL,
    steps JSONB NOT NULL,
    tags JSONB NOT NULL,
    difficulty TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    moderator_id TEXT,
    moderator_comment TEXT,
    created_at TIMESTAMP,
    reviewed_at TIMESTAMP
);
```

---

## 🔐 Безопасность

### Row Level Security (RLS)

Настроены политики для защиты данных:

**user_roles:**
- ✅ Пользователи могут видеть только свою роль
- ✅ Администраторы могут видеть все роли

**pending_recipes:**
- ✅ Пользователи могут отправлять рецепты
- ✅ Пользователи могут видеть только свои отправленные рецепты
- ✅ Администраторы могут видеть все рецепты на модерации
- ✅ Администраторы могут обновлять статус рецептов

### Проверка ролей на backend

Все админские endpoints проверяют роль пользователя:

```python
# Пример из backend/main.py
@app.get("/api/recipes/pending")
def get_pending_recipes(user_id: str = Depends(get_current_user_id)):
    # Check if user is admin
    role_result = supabase.rpc('get_user_role', {'p_user_id': user_id}).execute()
    role = role_result.data if role_result.data else 'user'
    
    if role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # ... rest of the code
```

---

## 🎯 API Endpoints

### User endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/user/role/{user_id}` | Получить роль пользователя |

### Admin endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/recipes/pending` | Получить список рецептов на модерации |
| POST | `/api/recipes/{id}/approve` | Одобрить рецепт |
| POST | `/api/recipes/{id}/reject` | Отклонить рецепт |

---

## 🐛 Troubleshooting

### Вкладка "Админ" не появляется

**Причина:** Пользователь не назначен администратором

**Решение:**
```sql
-- Проверьте роль
SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';

-- Если пусто, назначьте администратором
INSERT INTO user_roles (user_id, role) VALUES ('YOUR_USER_ID', 'admin');
```

### Ошибка "Admin access required"

**Причина:** Пользователь пытается получить доступ к админским функциям

**Решение:** Убедитесь что пользователь назначен администратором (см. выше)

### Рецепты не появляются в админ-панели

**Причина:** RLS политики не настроены

**Решение:** Выполните SQL из Шага 3 для настройки RLS

### Ошибка при одобрении рецепта

**Причина:** Проблема с функцией `approve_recipe`

**Решение:** Проверьте что функция создана:
```sql
SELECT * FROM pg_proc WHERE proname = 'approve_recipe';
```

Если не создана, выполните SQL из `backend/add_roles.sql` заново.

---

## 📋 Чеклист

- [ ] Выполнен SQL из `backend/add_roles.sql`
- [ ] Назначен администратор (INSERT INTO user_roles)
- [ ] Настроены RLS политики
- [ ] Закоммичены изменения
- [ ] Запушено в main
- [ ] Проверена вкладка "Админ" в навигации
- [ ] Проверена отправка рецепта на модерацию
- [ ] Проверено одобрение рецепта
- [ ] Проверено отклонение рецепта
- [ ] Проверено появление одобренного рецепта в общем списке

---

## 🎨 Дополнительные возможности

### Добавить больше администраторов

```sql
INSERT INTO user_roles (user_id, role) 
VALUES 
  ('user_id_1', 'admin'),
  ('user_id_2', 'admin');
```

### Удалить администратора

```sql
UPDATE user_roles SET role = 'user' WHERE user_id = 'USER_ID';
-- или
DELETE FROM user_roles WHERE user_id = 'USER_ID';
```

### Посмотреть все рецепты на модерации

```sql
SELECT 
    pr.id,
    pr.title,
    pr.author_id,
    pr.status,
    pr.created_at,
    u.email as author_email
FROM pending_recipes pr
LEFT JOIN auth.users u ON pr.author_id = u.id
WHERE pr.status = 'pending'
ORDER BY pr.created_at DESC;
```

### Статистика модерации

```sql
SELECT 
    status,
    COUNT(*) as count
FROM pending_recipes
GROUP BY status;
```

---

## 📚 Документация

- **[AUTH_SETUP.md](AUTH_SETUP.md)** — настройка аутентификации
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** — подключение Supabase
- **[DATABASE.md](DATABASE.md)** — документация по БД

---

**Готово! Система ролей и модерации настроена!** 🎉

Администраторы могут модерировать рецепты, отправленные пользователями, через специальную панель "Админ".
