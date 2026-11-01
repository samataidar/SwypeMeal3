# 📸 Настройка загрузки изображений

## Шаг 1: Создайте Storage Bucket в Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/storage)
2. Перейдите в **Storage**
3. Нажмите **New bucket**
4. Заполните:
   - **Name:** `recipe-images`
   - **Public bucket:** ✅ Включено (публичный доступ для чтения)
   - **File size limit:** `5242880` (5MB)
   - **Allowed MIME types:** `image/jpeg,image/png,image/webp,image/gif`
5. Нажмите **Create bucket**

## Шаг 2: Настройте политики доступа (Policies)

В созданном бакете `recipe-images` перейдите в **Policies** и добавьте:

### Policy 1: Разрешить загрузку аутентифицированным пользователям

```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipe-images');
```

### Policy 2: Разрешить публичное чтение

```sql
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'recipe-images');
```

### Policy 3: Разрешить удаление владельцу (опционально)

```sql
CREATE POLICY "Allow users to delete own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'recipe-images');
```

## Шаг 3: Проверьте переменные окружения

Убедитесь что на Vercel настроены:

```
VITE_SUPABASE_URL=https://bbelyefgpptozjfmeyqq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## Шаг 4: Закоммитьте изменения

```bash
git add src/components/ImageUpload.tsx src/components/AddRecipe.tsx
git commit -m "feat: add image upload with Supabase Storage"
git push origin main
```

## Как это работает

1. Пользователь выбирает изображение (drag & drop или клик)
2. Файл валидируется (тип, размер)
3. Изображение загружается в Supabase Storage
4. Генерируется публичный URL
5. URL сохраняется в рецепте

## Лимиты Supabase Free Tier

- **Storage:** 1 GB
- **Bandwidth:** 2 GB/month
- **File size:** до 5MB на файл

## Альтернативы (если лимиты не подходят)

### Cloudinary (бесплатно до 25GB)
```typescript
// Замените uploadImage в ImageUpload.tsx
const uploadToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'your_preset');
  
  const response = await fetch(
    'https://api.cloudinary.com/v1_1/your_cloud/image/upload',
    { method: 'POST', body: formData }
  );
  
  const data = await response.json();
  return data.secure_url;
};
```

### ImgBB (бесплатно, без лимитов)
```typescript
const uploadToImgBB = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch(
    'https://api.imgbb.com/1/upload?key=YOUR_API_KEY',
    { method: 'POST', body: formData }
  );
  
  const data = await response.json();
  return data.data.url;
};
```

## Troubleshooting

### Ошибка: "Bucket not found"
- Убедитесь что бакет `recipe-images` создан
- Проверьте название (должно быть точно `recipe-images`)

### Ошибка: "Permission denied"
- Проверьте политики доступа в Storage
- Убедитесь что пользователь аутентифицирован

### Изображение не загружается
- Проверьте размер файла (максимум 5MB)
- Проверьте формат (JPG, PNG, WebP, GIF)
- Проверьте лимиты Supabase (1GB storage)
