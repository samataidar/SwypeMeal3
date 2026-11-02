# 📸 Замена эмодзи на фотографии блюд

## ✅ Что было сделано

Все рецепты теперь используют реальные фотографии вместо эмодзи:

### Frontend (src/data.ts)
- ✅ Обновлены все 12 рецептов с URL изображений
- ✅ Изображения из Unsplash (бесплатные, высокого качества)

### Backend (backend/main.py)
- ✅ Обновлены все 12 рецептов с URL изображений
- ✅ Синхронизировано с frontend

### Компоненты
- ✅ **SwipeView** — карточки показывают фотографии
- ✅ **CookQueue** — очередь показывает миниатюры
- ✅ **History** — история показывает миниатюры
- ✅ **AddRecipe** — форма принимает URL изображения с превью

---

## 🗄️ Обновление Supabase

### Шаг 1: Выполните SQL в Supabase

Откройте [Supabase SQL Editor](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/sql) и выполните код из файла `backend/update_images.sql`:

```sql
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&h=600&fit=crop' WHERE id = '1';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=800&h=600&fit=crop' WHERE id = '2';
-- ... и так далее для всех 12 рецептов
```

### Шаг 2: Проверьте результат

```sql
SELECT id, title, image FROM recipes ORDER BY id;
```

Должны увидеть URL изображений вместо эмодзи.

---

## 🚀 Деплой

### Закоммитьте и запушьте изменения:

```bash
git add src/ backend/
git commit -m "feat: Replace emoji with real food photos"
git push origin main
```

Render автоматически задеплоит новую версию.

---

## 📸 Источники изображений

Все изображения из **Unsplash** (бесплатные, высокое качество):

| Рецепт | Изображение |
|--------|-------------|
| Паста Карбонара | https://images.unsplash.com/photo-1612874742237-6526221588e3 |
| Том Ям | https://images.unsplash.com/photo-1548943487-a2e4e43b4853 |
| Боул с курицей | https://images.unsplash.com/photo-1512621776951-a57141f2eefd |
| Ризотто | https://images.unsplash.com/photo-1476124369491-e7addf5db371 |
| Тако | https://images.unsplash.com/photo-1565299585323-38d6b0865b47 |
| Лосось терияки | https://images.unsplash.com/photo-1467003909585-2f8a72700288 |
| Шаурма | https://images.unsplash.com/photo-1529006557810-274b9b2fc783 |
| Тирамису | https://images.unsplash.com/photo-1571877227200-a0d98ea607e9 |
| Том Кха Гай | https://images.unsplash.com/photo-1547592180-85f173990554 |
| Панкейки | https://images.unsplash.com/photo-1528207776951-a57141f2eefd |
| Карри с нутом | https://images.unsplash.com/photo-1585937421612-70a008356fbe |
| Стейк рибай | https://images.unsplash.com/photo-1544025162-d76694265947 |

---

## 🎨 Как добавить свои изображения

### Вариант 1: Unsplash (рекомендуется)

1. Откройте https://unsplash.com
2. Найдите фото блюда
3. Скопируйте URL (правый клик → Copy image address)
4. Добавьте параметры размера: `?w=800&h=600&fit=crop`

Пример:
```
https://images.unsplash.com/photo-XXXXX?w=800&h=600&fit=crop
```

### Вариант 2: Свои фотографии

1. Загрузите фото на хостинг (Imgur, Cloudinary, Supabase Storage)
2. Получите прямой URL
3. Используйте в рецептах

### Вариант 3: Supabase Storage

1. Включите Storage в Supabase
2. Создайте bucket `recipe-images`
3. Загрузите изображения
4. Используйте публичные URL

---

## 📋 Чеклист

- [ ] Обновлены рецепты в `src/data.ts`
- [ ] Обновлены рецепты в `backend/main.py`
- [ ] Обновлены компоненты (SwipeView, CookQueue, History, AddRecipe)
- [ ] Выполнен SQL в Supabase (`backend/update_images.sql`)
- [ ] Закоммичены изменения
- [ ] Запушено в main
- [ ] Проверено на production

---

## ✅ Результат

После деплоя:
- 📸 Карточки рецептов показывают реальные фотографии
- 🎨 Красивый, профессиональный вид
- 📱 Адаптивные изображения (object-cover)
- 🚀 Быстрая загрузка (Unsplash CDN)

---

**Готово! Теперь рецепты выглядят профессионально с реальными фотографиями!** 🎉
