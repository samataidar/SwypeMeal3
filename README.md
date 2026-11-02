# SwypeMeal

Приложение для выбора рецептов методом свайпа (как в Tinder).

## 🚀 Деплой

### Frontend (Vercel)

1. Подключите репозиторий к Vercel
2. Добавьте переменные окружения:
   - `VITE_SUPABASE_URL` - URL вашего Supabase проекта
   - `VITE_SUPABASE_ANON_KEY` - Anon key из Supabase
   - `VITE_CLOUDINARY_CLOUD_NAME` - Cloud name из Cloudinary
   - `VITE_CLOUDINARY_UPLOAD_PRESET` - Upload preset из Cloudinary

### Backend (Render)

1. Создайте Web Service на Render
2. Подключите репозиторий
3. Укажите Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Добавьте переменные окружения:
   - `SUPABASE_URL` - URL вашего Supabase проекта
   - `SUPABASE_KEY` - Service role key из Supabase
   - `USE_SUPABASE` - `true`

### Supabase

1. Создайте проект на supabase.com
2. Выполните SQL из `backend/init_db.sql`
3. Создайте Storage bucket `recipe-images` (публичный)
4. Настройте аутентификацию через Google OAuth

### Cloudinary

1. Создайте аккаунт на cloudinary.com
2. Создайте Unsigned Upload Preset
3. Добавьте Cloud Name и Upload Preset в переменные окружения

## 📱 Особенности

- ✅ Свайп-механика выбора рецептов
- ✅ Очередь готовки (FIFO) с ручным управлением
- ✅ История приготовленных блюд с оценками
- ✅ КБЖУ для каждого рецепта
- ✅ Фильтры по калориям, времени, сложности
- ✅ Загрузка своих изображений с автоматической оптимизацией
- ✅ Система ролей (user/admin)
- ✅ Модерация рецептов
- ✅ Синхронизация через Supabase
- ✅ Аутентификация через Google OAuth

## 🛠️ Технологии

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Backend:** Python, FastAPI, Supabase REST API
- **База данных:** Supabase PostgreSQL
- **Хранение изображений:** Cloudinary
- **Аутентификация:** Supabase Auth (Google OAuth)

## 📄 Структура проекта

```
swypemeal/
├── src/
│   ├── components/       # React компоненты
│   ├── contexts/         # React контексты (AuthContext)
│   ├── lib/             # Библиотеки (Supabase client)
│   ├── utils/           # Утилиты (оптимизация изображений)
│   ├── App.tsx          # Главный компонент
│   ├── api.ts           # API клиент
│   ├── data.ts          # Данные рецептов
│   ├── store.ts         # Управление состоянием
│   └── types.ts         # TypeScript типы
├── backend/
│   ├── main.py          # FastAPI сервер
│   ├── requirements.txt # Python зависимости
│   └── init_db.sql      # SQL для инициализации БД
└── README.md
```

## 🔧 Локальная разработка

```bash
# Frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## 📝 Лицензия

MIT
