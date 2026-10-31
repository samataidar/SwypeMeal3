-- Добавление системы ролей для пользователей
-- Выполните этот SQL в Supabase SQL Editor

-- Таблица ролей пользователей
CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Функция для проверки роли пользователя
CREATE OR REPLACE FUNCTION get_user_role(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM user_roles 
    WHERE user_id = p_user_id;
    
    -- Если роль не найдена, возвращаем 'user' по умолчанию
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql;

-- Функция для проверки является ли пользователь администратором
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql;

-- Таблица для рецептов на модерации
CREATE TABLE IF NOT EXISTS pending_recipes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    moderator_id TEXT,
    moderator_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_pending_recipes_status ON pending_recipes(status);
CREATE INDEX IF NOT EXISTS idx_pending_recipes_author_id ON pending_recipes(author_id);
CREATE INDEX IF NOT EXISTS idx_pending_recipes_created_at ON pending_recipes(created_at DESC);

-- Функция для отправки рецепта на модерацию
CREATE OR REPLACE FUNCTION submit_recipe_for_moderation(
    p_author_id TEXT,
    p_title TEXT,
    p_description TEXT,
    p_image TEXT,
    p_cook_time INTEGER,
    p_servings INTEGER,
    p_calories INTEGER,
    p_protein DECIMAL,
    p_fat DECIMAL,
    p_carbs DECIMAL,
    p_ingredients JSONB,
    p_steps JSONB,
    p_tags JSONB,
    p_difficulty TEXT
)
RETURNS TEXT AS $$
DECLARE
    new_recipe_id TEXT;
BEGIN
    INSERT INTO pending_recipes (
        author_id, title, description, image, cook_time, servings,
        calories, protein, fat, carbs, ingredients, steps, tags, difficulty
    ) VALUES (
        p_author_id, p_title, p_description, p_image, p_cook_time, p_servings,
        p_calories, p_protein, p_fat, p_carbs, p_ingredients, p_steps, p_tags, p_difficulty
    )
    RETURNING id INTO new_recipe_id;
    
    RETURN new_recipe_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для одобрения рецепта
CREATE OR REPLACE FUNCTION approve_recipe(
    p_recipe_id TEXT,
    p_moderator_id TEXT,
    p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    recipe_record RECORD;
BEGIN
    -- Проверяем что модератор - администратор
    IF NOT is_user_admin(p_moderator_id) THEN
        RAISE EXCEPTION 'User is not an admin';
    END IF;
    
    -- Получаем рецепт
    SELECT * INTO recipe_record FROM pending_recipes WHERE id = p_recipe_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipe not found';
    END IF;
    
    -- Добавляем в основную таблицу рецептов
    INSERT INTO recipes (
        id, title, description, image, cook_time, servings,
        calories, protein, fat, carbs, ingredients, steps, tags,
        difficulty, is_custom, author_id, status
    ) VALUES (
        gen_random_uuid()::text, recipe_record.title, recipe_record.description,
        recipe_record.image, recipe_record.cook_time, recipe_record.servings,
        recipe_record.calories, recipe_record.protein, recipe_record.fat,
        recipe_record.carbs, recipe_record.ingredients, recipe_record.steps,
        recipe_record.tags, recipe_record.difficulty, true, recipe_record.author_id, 'approved'
    );
    
    -- Обновляем статус в pending_recipes
    UPDATE pending_recipes
    SET status = 'approved',
        moderator_id = p_moderator_id,
        moderator_comment = p_comment,
        reviewed_at = NOW()
    WHERE id = p_recipe_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Функция для отклонения рецепта
CREATE OR REPLACE FUNCTION reject_recipe(
    p_recipe_id TEXT,
    p_moderator_id TEXT,
    p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Проверяем что модератор - администратор
    IF NOT is_user_admin(p_moderator_id) THEN
        RAISE EXCEPTION 'User is not an admin';
    END IF;
    
    -- Обновляем статус
    UPDATE pending_recipes
    SET status = 'rejected',
        moderator_id = p_moderator_id,
        moderator_comment = p_comment,
        reviewed_at = NOW()
    WHERE id = p_recipe_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Назначение первого администратора (замените YOUR_USER_ID на реальный user_id)
-- INSERT INTO user_roles (user_id, role) VALUES ('YOUR_USER_ID', 'admin');

-- Проверка создания таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('user_roles', 'pending_recipes')
ORDER BY table_name;
