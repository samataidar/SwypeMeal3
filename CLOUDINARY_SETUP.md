# 📸 Настройка Cloudinary для загрузки изображений

## Шаг 1: Создайте аккаунт Cloudinary

1. Перейдите на [cloudinary.com](https://cloudinary.com)
2. Нажмите **Sign Up for Free**
3. Зарегистрируйтесь (бесплатный план включает 25GB хранилища)

## Шаг 2: Получите Cloud Name

1. После входа в Dashboard, найдите **Cloud Name** на главной странице
2. Скопируйте его (например: `dxyz1234`)

## Шаг 3: Создайте Upload Preset

1. Перейдите в **Settings** → **Upload** (шестерёнка в левом меню)
2. Прокрутите до раздела **Upload presets**
3. Нажмите **Add upload preset**
4. Настройте:
   - **Preset name:** `swypemeal-recipes` (или любое другое)
   - **Signing Mode:** `Unsigned` (важно! для загрузки без авторизации)
   - **Default folder:** `swypemeal/recipes`
5. Нажмите **Save**

## Шаг 4: Добавьте переменные окружения на Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте две переменные:

**Переменная 1:**
| Key | Value |
|-----|-------|
| `VITE_CLOUDINARY_CLOUD_NAME` | `dxyz1234` (ваш Cloud Name) |

**Переменная 2:**
| Key | Value |
|-----|-------|
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `swypemeal-recipes` (ваш Upload Preset) |

5. Нажмите **Save**
6. Redeploy проект

## Шаг 5: Закоммитьте изменения

```bash
git add src/components/ImageUpload.tsx
git commit -m "feat: use Cloudinary for image uploads"
git push origin main
```

## Шаг 6: Проверьте работу

1. Откройте приложение
2. Перейдите в раздел "Добавить рецепт"
3. Попробуйте загрузить изображение
4. Проверьте что изображение загрузилось и отображается

## 📊 Лимиты Cloudinary Free Tier

- **Хранилище:** 25 GB
- **Bandwidth:** 25 GB/месяц
- **Размер файла:** до 10MB
- **Трансформации:** без лимитов
- **CDN:** глобальный (быстрая загрузка по всему миру)

## 🎨 Оптимизация изображений

Cloudinary автоматически оптимизирует изображения. Вы можете добавить параметры к URL:

```typescript
// Оригинальное изображение
https://res.cloudinary.com/YOUR_CLOUD/image/upload/swypemeal/recipes/image.jpg

// С оптимизацией (автоматическое качество и формат)
https://res.cloudinary.com/YOUR_CLOUD/image/upload/f_auto,q_auto/swypemeal/recipes/image.jpg

// С ресайзом (800x600)
https://res.cloudinary.com/YOUR_CLOUD/image/upload/w_800,h_600,c_fill/swypemeal/recipes/image.jpg
```

## 🔧 Troubleshooting

### Ошибка: "Upload preset not found"
- Убедитесь что создали Upload Preset
- Проверьте что Signing Mode = `Unsigned`
- Проверьте название preset в переменных окружения

### Ошибка: "Invalid cloud name"
- Проверьте Cloud Name в переменных окружения
- Убедитесь что нет опечаток

### Изображение не загружается
- Проверьте размер файла (максимум 10MB)
- Проверьте формат (JPG, PNG, WebP, GIF)
- Откройте консоль браузера для деталей ошибки

### После Redeploy изменения не применились
- Очистите кэш браузера (Ctrl+Shift+R)
- Проверьте что переменные окружения добавлены
- Проверьте что проект redeployed

## 📈 Мониторинг использования

1. Откройте [Cloudinary Dashboard](https://cloudinary.com/console)
2. Перейдите в **Dashboard** → **Usage**
3. Отслеживайте:
   - Хранилище (Storage)
   - Bandwidth
   - Количество трансформаций

## 🚀 Преимущества Cloudinary

✅ **25GB бесплатно** (vs 1GB в Supabase)  
✅ **Автоматическая оптимизация** (WebP, AVIF)  
✅ **Глобальный CDN** (быстрая загрузка)  
✅ **Трансформации на лету** (ресайз, кроп, фильтры)  
✅ **Без лимитов на трансформации**  
✅ **Поддержка видео** (если понадобится)  

## 💰 Когда понадобится платный план

Бесплатный план подходит для:
- До 1000 пользователей
- До 25GB изображений
- До 25GB трафика/месяц

Платный план ($89/месяц) нужен если:
- Больше 100GB хранилища
- Больше 100GB трафика/месяц
- Нужна приоритетная поддержка

Для старта бесплатного плана более чем достаточно! 🎉
