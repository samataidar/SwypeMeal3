-- Проверка статуса рецептов на модерации
-- Выполните этот SQL в Supabase SQL Editor

-- Проверить все записи в pending_recipes
SELECT 
    id,
    title,
    status,
    author_id,
    created_at,
    moderator_id,
    moderator_comment,
    reviewed_at
FROM pending_recipes
ORDER BY created_at DESC;

-- Проверить только записи со статусом 'pending'
SELECT COUNT(*) as pending_count
FROM pending_recipes
WHERE status = 'pending';

-- Если статус не 'pending', обновить его
-- UPDATE pending_recipes 
-- SET status = 'pending' 
-- WHERE status IS NULL OR status != 'pending';
