-- SwypeMeal Database Schema for Supabase
-- Выполните этот SQL в Supabase SQL Editor

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица рецептов
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
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
    is_custom BOOLEAN DEFAULT FALSE,
    author_id TEXT,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица очереди готовки
CREATE TABLE IF NOT EXISTS queue_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    planned_date TIMESTAMP WITH TIME ZONE
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_queue_items_user_id ON queue_items(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_items_position ON queue_items(user_id, position);

-- Таблица истории приготовленных блюд
CREATE TABLE IF NOT EXISTS history_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    cooked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_history_items_user_id ON history_items(user_id);
CREATE INDEX IF NOT EXISTS idx_history_items_cooked_at ON history_items(user_id, cooked_at DESC);

-- Таблица свайпнутых рецептов
CREATE TABLE IF NOT EXISTS swiped_recipes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('like', 'dislike')),
    swiped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_swiped_recipes_user_id ON swiped_recipes(user_id);

-- Таблица настроек пользователя
CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    max_calories INTEGER DEFAULT 800,
    max_cook_time INTEGER DEFAULT 60,
    exclude_tags JSONB DEFAULT '[]',
    preferred_difficulty JSONB DEFAULT '["easy", "medium", "hard"]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка начальных рецептов (опционально)
INSERT INTO recipes (id, title, description, image, cook_time, servings, calories, protein, fat, carbs, ingredients, steps, tags, difficulty)
VALUES 
(
    '1',
    'Паста Карбонара',
    'Классическая итальянская паста с беконом, яйцом и пармезаном.',
    '🍝',
    25,
    2,
    520,
    22,
    24,
    55,
    '["Спагетти 200г", "Бекон 150г", "Яйца 3шт", "Пармезан 80г", "Чёрный перец", "Соль"]',
    '["Вскипятите воду, посолите, отварите пасту до al dente", "Нарежьте бекон кубиками, обжарьте до хрустящей корочки", "Смешайте яйца с тёртым пармезаном и перцем", "Слейте пасту, оставив стакан воды", "Добавьте пасту к бекону, снимите с огня", "Влейте яичную смесь, быстро перемешайте", "Подавайте с дополнительным пармезаном"]',
    '["итальянская", "паста", "быстрая"]',
    'easy'
),
(
    '2',
    'Том Ям с креветками',
    'Острый тайский суп с креветками, грибами и кокосовым молоком. Ароматный и согревающий.',
    '🍜',
    35,
    4,
    280,
    18,
    12,
    22,
    '["Креветки 400г", "Кокосовое молоко 400мл", "Грибы 200г", "Лемонграсс 2 стебля", "Галангал 30г", "Лайм 2шт", "Перец чили 2шт", "Рыбный соус 3 ст.л.", "Кинза"]',
    '["Вскипятите 1л воды с лемонграссом и галангалом", "Добавьте грибы, варите 5 минут", "Положите креветки, варите 3 минуты", "Влейте кокосовое молоко", "Добавьте рыбный соус, сок лайма и чили", "Подавайте с кинзой и рисом"]',
    '["тайская", "суп", "острая", "морепродукты"]',
    'medium'
),
(
    '3',
    'Боул с курицей и авокадо',
    'Полезный боул с grilled курицей, авокадо, киноа и соусом тахини. Идеальный обед.',
    '🥗',
    30,
    2,
    450,
    35,
    20,
    38,
    '["Куриная грудка 300г", "Киноа 150г", "Авокадо 1шт", "Огурец 1шт", "Помидоры черри 200г", "Тахини 2 ст.л.", "Лимон", "Оливковое масло"]',
    '["Отварите киноа согласно инструкции", "Замаринуйте курицу в специях, обжарьте до готовности", "Нарежьте авокадо, огурец и помидоры", "Приготовьте соус: тахини + лимонный сок + вода", "Соберите боул: киноа, овощи, курица, авокадо", "Полейте соусом тахини"]',
    '["здоровая", "боул", "высокобелковая"]',
    'easy'
)
ON CONFLICT (id) DO NOTHING;

-- Проверка создания таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
