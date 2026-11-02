# 🚀 Деплой SwypeMeal на Render.com

Пошаговая инструкция по деплою backend и frontend на Render.

---

## 📋 Проблема и решение

### Ошибка при деплои:
```
pydantic-core==2.14.5 → error: failed to create directory
Read-only file system (os error 30)
```

### Причина:
- Render по умолчанию использует **Python 3.14.8** (слишком новая версия)
- Старые версии `pydantic-core` не имеют pre-built wheels для Python 3.14
- Пытается скомпилироваться через Rust/maturin → ошибка в read-only FS

### Решение:
✅ Использовать **Python 3.12.7** (стабильная версия с готовыми wheels)  
✅ Обновить зависимости до совместимых версий  
✅ Зафиксировать версию через `runtime.txt`

---

## 🔧 Что уже исправлено

В репозитории добавлены файлы:

1. **`runtime.txt`** (в корне)
   ```
   python-3.12.7
   ```

2. **`.python-version`** (в корне)
   ```
   3.12.7
   ```

3. **`backend/requirements.txt`** (обновлён)
   ```
   fastapi>=0.115.0
   uvicorn[standard]>=0.32.0
   pydantic>=2.10.0
   python-multipart>=0.0.12
   ```

4. **`Procfile`** (в корне)
   ```
   web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

5. **`render.yaml`** (в корне) — опционально

6. **`build.sh`** и **`start.sh`** — скрипты деплоя

---

## 📦 Деплой Backend

### Шаг 1: Подготовьте репозиторий

Убедитесь, что все файлы закоммичены и запушены:

```bash
git add .
git commit -m "Fix: Update Python version and dependencies for Render"
git push origin main
```

### Шаг 2: Создайте Web Service на Render

1. Зайдите на [render.com](https://render.com)
2. Войдите через GitHub
3. Нажмите **"New +"** → **"Web Service"**
4. Подключите репозиторий **SwypeMeal3**

### Шаг 3: Настройте параметры

```
Name: swypemeal-backend
Region: Oregon (или ближайший к вам)
Branch: main
Root Directory: backend
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
Instance Type: Free
```

**Важно:**
- ✅ Root Directory: `backend` (не пусто!)
- ✅ Build Command: `pip install -r requirements.txt`
- ✅ Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Шаг 4: Добавьте переменную окружения

В разделе **"Environment"** → **"Environment Variables"** → **"Add Environment Variable"**:

```
Key: PYTHON_VERSION
Value: 3.12.7
```

### Шаг 5: Деплой

Нажмите **"Create Web Service"**.

Render автоматически:
1. Определит Python 3.12.7 из `runtime.txt`
2. Установит зависимости из `requirements.txt`
3. Запустит сервер через `Procfile`

### Шаг 6: Проверьте

После деплоя вы получите URL:
```
https://swypemeal-backend.onrender.com
```

Проверьте API:
```
https://swypemeal-backend.onrender.com/
https://swypemeal-backend.onrender.com/docs
```

---

## 🌐 Деплой Frontend

### Вариант A: Vercel (рекомендуется)

1. Зайдите на [vercel.com](https://vercel.com)
2. Импортируйте репозиторий
3. Настройки:
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```
4. Деплой

Получите URL: `https://swypemeal.vercel.app`

### Вариант B: Netlify

1. Зайдите на [netlify.com](https://netlify.com)
2. Drag & drop папку `dist/` или подключите Git
3. Настройки:
   ```
   Build command: npm run build
   Publish directory: dist
   ```

### Вариант C: Render Static Site

1. На Render: **"New +"** → **"Static Site"**
2. Подключите репозиторий
3. Настройки:
   ```
   Root Directory: (пусто — фронтенд в корне)
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

---

## 🔗 Связывание Frontend и Backend

### Обновите API URL в frontend

В `src/api.ts` или где у вас API calls:

```typescript
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://swypemeal-backend.onrender.com'
  : 'http://localhost:8000';
```

Или захардкодьте (для простоты):

```typescript
const API_URL = 'https://swypemeal-backend.onrender.com';
```

### Настройте CORS на backend

В `backend/main.py` уже настроено:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешить все origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Для production можно указать конкретный domain:

```python
allow_origins=["https://swypemeal.vercel.app"],
```

---

## 📱 Telegram Mini App

### Требования:
- ✅ HTTPS (Render и Vercel предоставляют автоматически)
- ✅ Свой домен (опционально, но рекомендуется)

### Настройка:

1. Создайте бота через [@BotFather](https://t.me/BotFather):
   ```
   /newbot
   Name: SwypeMeal Bot
   Username: swypemeal_bot
   ```

2. Настройте Web App:
   ```
   /mybots → @swypemeal_bot → Bot Settings → Menu Button
   Configure Menu Button → URL: https://swypemeal.vercel.app
   ```

3. Готово! Бот будет открывать ваше приложение.

---

## ⚠️ Ограничения Render Free Tier

### Что нужно знать:

1. **Ephemeral Storage**
   - Файлы в `backend/data/` удаляются при перезапуске
   - Для production используйте PostgreSQL

2. **Sleep Mode**
   - Free tier засыпает после 15 минут неактивности
   - Первый запрос может занять 30-50 секунд

3. **Limits**
   - 750 часов/месяц
   - 512 MB RAM
   - 0.1 CPU

### Миграция на PostgreSQL (опционально)

```bash
# Установите зависимости
pip install sqlalchemy psycopg2-binary

# Создайте PostgreSQL на Render
# New + → PostgreSQL → Free

# Обновите backend/database.py
# См. https://fastapi.tiangolo.com/tutorial/sql-databases/
```

---

## 🐛 Troubleshooting

### Ошибка: `pydantic-core` не компилируется

**Решение:**
```bash
# Проверьте runtime.txt в корне репозитория
cat runtime.txt
# Должно быть: python-3.12.7

# Если нет — создайте:
echo "python-3.12.7" > runtime.txt
git add runtime.txt
git commit -m "Fix: Pin Python version"
git push
```

### Ошибка: `Module not found: main`

**Решение:**
- Проверьте Root Directory: должен быть `backend`
- Проверьте, что `main.py` находится в `backend/`

### Ошибка: `Port binding failed`

**Решение:**
```python
# В main.py используйте $PORT
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Ошибка: CORS

**Решение:**
```python
# В main.py добавьте URL фронтенда
allow_origins=[
    "https://swypemeal.vercel.app",
    "http://localhost:5173",  # для локальной разработки
],
```

### Backend не отвечает

**Проверьте:**
1. Логи на Render (вкладка "Logs")
2. URL API правильный
3. CORS настроен
4. Backend запущен (статус "Live")

---

## ✅ Чеклист перед деплоем

- [ ] `runtime.txt` создан с `python-3.12.7`
- [ ] `backend/requirements.txt` обновлён
- [ ] `Procfile` создан
- [ ] Все файлы закоммичены и запушены
- [ ] Root Directory = `backend`
- [ ] Build Command = `pip install -r requirements.txt`
- [ ] Start Command = `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] PYTHON_VERSION = `3.12.7` в Environment Variables
- [ ] Frontend задеплоен на Vercel/Netlify
- [ ] API URL обновлён в frontend
- [ ] CORS настроен на backend
- [ ] Telegram бот создан (опционально)

---

## 🎉 Готово!

После успешного деплоя:

- **Backend:** `https://swypemeal-backend.onrender.com`
- **Frontend:** `https://swypemeal.vercel.app`
- **API Docs:** `https://swypemeal-backend.onrender.com/docs`
- **Telegram Bot:** `@swypemeal_bot`

---

## 📞 Поддержка

- Render Docs: https://render.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- Telegram Bot API: https://core.telegram.org/bots/api

---

**Если возникли проблемы — проверьте логи на Render и убедитесь, что все файлы из этого руководства присутствуют в репозитории.**
