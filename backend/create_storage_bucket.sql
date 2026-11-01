-- Создание бакета для изображений рецептов
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Создаём бакет (если ещё не создан)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images',
  true,
  5242880, -- 5MB в байтах
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Политика: разрешить загрузку аутентифицированным пользователям
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipe-images');

-- 3. Политика: разрешить публичное чтение всем
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'recipe-images');

-- 4. Политика: разрешить удаление аутентифицированным пользователям
CREATE POLICY "Allow users to delete own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'recipe-images');

-- Проверка создания
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'recipe-images';
