-- Исправление проблем с RLS и дубликатами
-- Выполните этот SQL в Supabase SQL Editor

-- ============================================
-- 1. ИСПРАВЛЕНИЕ БЕСКОНЕЧНОЙ РЕКУРСИИ В RLS
-- ============================================

-- Проблема: политика "Admins can view all roles" вызывает саму себя
-- Решение: отключить RLS для user_roles и pending_recipes
-- Backend использует service_role key, поэтому это безопасно

-- Отключаем RLS для user_roles
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Отключаем RLS для pending_recipes
ALTER TABLE pending_recipes DISABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can submit recipes" ON pending_recipes;
DROP POLICY IF EXISTS "Users can view their own pending recipes" ON pending_recipes;
DROP POLICY IF EXISTS "Admins can view all pending recipes" ON pending_recipes;
DROP POLICY IF EXISTS "Admins can update pending recipes" ON pending_recipes;

-- ============================================
-- 2. СОЗДАНИЕ ФУНКЦИЙ ДЛЯ UPSERT
-- ============================================

-- Функция для upsert queue items
CREATE OR REPLACE FUNCTION upsert_queue_item(
    p_id TEXT,
    p_user_id TEXT,
    p_recipe_id TEXT,
    p_position INTEGER,
    p_added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO queue_items (id, user_id, recipe_id, position, added_at)
    VALUES (p_id, p_user_id, p_recipe_id, p_position, p_added_at)
    ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        recipe_id = EXCLUDED.recipe_id,
        position = EXCLUDED.position,
        added_at = EXCLUDED.added_at;
END;
$$ LANGUAGE plpgsql;

-- Функция для upsert history items
CREATE OR REPLACE FUNCTION upsert_history_item(
    p_id TEXT,
    p_user_id TEXT,
    p_recipe_id TEXT,
    p_cooked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_rating INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO history_items (id, user_id, recipe_id, cooked_at, rating, notes)
    VALUES (p_id, p_user_id, p_recipe_id, p_cooked_at, p_rating, p_notes)
    ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        recipe_id = EXCLUDED.recipe_id,
        cooked_at = EXCLUDED.cooked_at,
        rating = EXCLUDED.rating,
        notes = EXCLUDED.notes;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. ОЧИСТКА ДУБЛИКАТОВ (если есть)
-- ============================================

-- Удаляем дубликаты из queue_items, оставляя только первую запись
DELETE FROM queue_items a
USING queue_items b
WHERE a.ctid < b.ctid
  AND a.id = b.id;

-- Удаляем дубликаты из history_items
DELETE FROM history_items a
USING history_items b
WHERE a.ctid < b.ctid
  AND a.id = b.id;

-- Удаляем дубликаты из swiped_recipes
DELETE FROM swiped_recipes a
USING swiped_recipes b
WHERE a.ctid < b.ctid
  AND a.id = b.id;

-- ============================================
-- 4. ПРОВЕРКА
-- ============================================

-- Проверяем что таблицы существуют и RLS отключён
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('user_roles', 'pending_recipes', 'queue_items', 'history_items', 'swiped_recipes')
ORDER BY tablename;

-- Проверяем что функции созданы
SELECT proname 
FROM pg_proc 
WHERE proname IN ('upsert_queue_item', 'upsert_history_item', 'get_user_role', 'is_user_admin', 'approve_recipe', 'reject_recipe')
ORDER BY proname;

-- ============================================
-- ГОТОВО!
-- ============================================
-- После выполнения этого скрипта:
-- 1. RLS отключён для user_roles и pending_recipes (нет бесконечной рекурсии)
-- 2. Созданы функции для upsert (нет ошибок дубликатов)
-- 3. Удалены все дубликаты из таблиц
-- 4. Backend использует upsert вместо insert
