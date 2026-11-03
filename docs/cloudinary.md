# 🔧 Настройка Cloudinary для загрузки изображений

## Проблема

Ошибка "Ошибка загрузки изображения" возникает когда Cloudinary не настроен.

## Решение

### Шаг 1: Создайте аккаунт Cloudinary

1. Перейдите на [cloudinary.com](https://cloudinary.com)
2. Нажмите **"Sign Up for Free"**
3. Зарегистрируйтесь (можно через Google)

### Шаг 2: Получите Cloud Name

1. После входа вы попадете в Dashboard
2. На главной странице найдите **"Cloud Name"** (например: `dxyz1234`)
3. Скопируйте это значение

### Шаг 3: Создайте Upload Preset

1. В левом меню нажмите **"Settings"** (шестеренка)
2. Перейдите во вкладку **"Upload"**
3. Прокрутите до секции **"Upload presets"**
4. Нажмите **"Add upload preset"**
5. Настройте:
   - **Preset name**: `swypemeal_unsigned` (или любое другое)
   - **Signing Mode**: **Unsigned** ⚠️ (ОБЯЗАТЕЛЬНО!)
   - **Default folder**: `swypemeal/recipes` (опционально)
6. Нажмите **"Save"**

### Шаг 4: Добавьте переменные окружения на Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект `swype-meal3`
3. Перейдите в **"Settings"** → **"Environment Variables"**
4. Добавьте две переменные:

**Переменная 1:**
- **Name**: `VITE_CLOUDINARY_CLOUD_NAME`
- **Value**: `dxyz1234` (ваш Cloud Name из шага 2)
- **Environment**: Production, Preview, Development (все три)

**Переменная 2:**
- **Name**: `VITE_CLOUDINARY_UPLOAD_PRESET`
- **Value**: `swypemeal_unsigned` (ваш Upload Preset из шага 3)
- **Environment**: Production, Preview, Development (все три)

5. Нажмите **"Save"**

### Шаг 5: Redeploy проект

1. Перейдите в **"Deployments"**
2. Найдите последний деплой
3. Нажмите **⋮** → **"Redeploy"**
4. Дождитесь завершения деплоя

### Шаг 6: Проверьте работу

1. Откройте сайт https://swype-meal3.vercel.app
2. Перейдите в раздел **"Добавить"**
3. Попробуйте загрузить изображение
4. Откройте консоль браузера (F12) и проверьте логи:

**Должно быть:**
```
[ImageUpload] Начинаем загрузку: image.jpg 2.5 MB
[ImageUpload] Оптимизация: 2.5 MB → 150 KB
[ImageUpload] Загружаем в Cloudinary: dxyz1234
[ImageUpload] Response status: 200
[ImageUpload] Успешно загружено: https://res.cloudinary.com/...
```

## Проверка настроек

### В консоли браузера

Если видите ошибку:
```
[ImageUpload] Cloudinary не настроен. Добавьте переменные окружения:
  VITE_CLOUDINARY_CLOUD_NAME
  VITE_CLOUDINARY_UPLOAD_PRESET
```

Значит переменные не добавлены на Vercel. Вернитесь к шагу 4.

### Проверка Upload Preset

Если видите ошибку:
```
[ImageUpload] Cloudinary error: {error: {message: "Upload preset not found"}}
```

Значит:
1. Upload Preset не создан
2. Или Signing Mode не установлен в **Unsigned**
3. Или название preset не совпадает с переменной `VITE_CLOUDINARY_UPLOAD_PRESET`

### Проверка Cloud Name

Если видите ошибку:
```
[ImageUpload] Cloudinary error: {error: {message: "Unknown cloud name"}}
```

Значит:
1. Cloud Name указан неправильно
2. Проверьте что в переменной `VITE_CLOUDINARY_CLOUD_NAME` точно такое же значение как в Dashboard Cloudinary

## Альтернатива: Вставка URL

Если загрузка не работает, можно временно вставить URL изображения напрямую:

1. Загрузите изображение на любой хостинг (например, imgur.com)
2. Скопируйте прямую ссылку на изображение
3. Вставьте в поле "URL изображения" в форме добавления рецепта

## Лимиты Cloudinary Free

- **Хранилище**: 25 GB
- **Трафик**: 25 GB/месяц
- **Трансформации**: без лимитов
- **Размер файла**: до 10 MB

Этого более чем достаточно для старта!

## Полезные ссылки

- [Cloudinary Dashboard](https://cloudinary.com/console)
- [Документация по загрузке](https://cloudinary.com/documentation/upload_images)
- [Unsigned Upload Presets](https://cloudinary.com/documentation/upload_images#unsigned_upload)

## Troubleshooting

### Ошибка CORS

Если видите ошибку CORS в консоли:
```
Access to fetch at 'https://api.cloudinary.com/...' has been blocked by CORS policy
```

Решение:
1. Убедитесь что Upload Preset создан с **Signing Mode = Unsigned**
2. Проверьте что Cloud Name указан правильно

### Изображение не оптимизируется

Если оптимизация зависает или не работает:
1. Проверьте что браузер поддерживает Canvas API (все современные браузеры поддерживают)
2. Попробуйте другое изображение
3. Проверьте консоль на ошибки

### После Redeploy изменения не применились

1. Очистите кэш браузера (Ctrl+Shift+R или Cmd+Shift+R)
2. Проверьте что переменные окружения добавлены для всех окружений (Production, Preview, Development)
3. Убедитесь что Redeploy завершился успешно

## Проверочный чеклист

- [ ] Создан аккаунт Cloudinary
- [ ] Скопирован Cloud Name
- [ ] Создан Upload Preset с Signing Mode = Unsigned
- [ ] Добавлена переменная `VITE_CLOUDINARY_CLOUD_NAME` на Vercel
- [ ] Добавлена переменная `VITE_CLOUDINARY_UPLOAD_PRESET` на Vercel
- [ ] Выбраны все окружения (Production, Preview, Development)
- [ ] Выполнен Redeploy проекта
- [ ] Очищен кэш браузера
- [ ] Загрузка изображения работает

## Готово!

После выполнения всех шагов загрузка изображений должна работать. Если проблема сохраняется, откройте консоль браузера (F12) и пришлите скриншот ошибок.
