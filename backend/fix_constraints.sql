-- Удалить все foreign key constraints для упрощения работы
-- Выполните этот SQL в Supabase SQL Editor

-- Удаляем foreign key constraints
ALTER TABLE queue_items DROP CONSTRAINT IF EXISTS queue_items_user_id_fkey;
ALTER TABLE queue_items DROP CONSTRAINT IF EXISTS queue_items_recipe_id_fkey;

ALTER TABLE history_items DROP CONSTRAINT IF EXISTS history_items_user_id_fkey;
ALTER TABLE history_items DROP CONSTRAINT IF EXISTS history_items_recipe_id_fkey;

ALTER TABLE swiped_recipes DROP CONSTRAINT IF EXISTS swiped_recipes_user_id_fkey;
ALTER TABLE swiped_recipes DROP CONSTRAINT IF EXISTS swiped_recipes_recipe_id_fkey;

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

-- Проверка
SELECT 
    tc.table_name, 
    kcu.constraint_name 
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
