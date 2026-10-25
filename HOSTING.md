# 🚀 Инструкция по хостингу SwypeMeal

Полное руководство по развёртыванию приложения SwypeMeal в production.

---

## 📋 Содержание

1. [Требования](#требования)
2. [Варианты хостинга](#варианты-хостинга)
3. [Frontend деплой](#frontend-деплой)
4. [Backend деплой](#backend-деплой)
5. [Telegram Mini App](#telegram-mini-app)
6. [Production рекомендации](#production-рекомендации)

---

## Требования

### Минимальные
- **Frontend:** Любой статический хостинг (Vercel, Netlify, GitHub Pages)
- **Backend:** Python 3.8+ сервер (Railway, Render, VPS)
- **Домен:** Опционально, но рекомендуется для Telegram Mini App

### Рекомендуемые
- VPS (DigitalOcean, Hetzner, Timeweb) от $5/мес
- Домен с SSL (Let's Encrypt)
- PostgreSQL для production базы данных

---

## Варианты хостинга

### 🟢 Вариант 1: Бесплатный (для тестирования)

**Frontend:** Vercel / Netlify / GitHub Pages  
**Backend:** Railway / Render (free tier)

#### Плюсы:
- ✅ Бесплатно
- ✅ Быстрый деплой
- ✅ Автоматический SSL

#### Минусы:
- ❌ Ограничения free tier
- ❌ Данные могут удаляться
- ❌ Не подходит для Telegram Mini App (нужен свой домен)

---

### 🟡 Вариант 2: Бюджетный VPS ($5-10/мес)

**Хостинги:** DigitalOcean, Hetzner, Timeweb, Reg.ru

#### Плюсы:
- ✅ Полный контроль
- ✅ Подходит для Telegram Mini App
- ✅ Можно настроить БД

#### Минусы:
- ❌ Нужна настройка сервера
- ❌ Нужно следить за безопасностью

---

### 🔴 Вариант 3: Production (от $20/мес)

**Хостинги:** AWS, Google Cloud, Azure, Yandex Cloud

#### Плюсы:
- ✅ Масштабируемость
- ✅ High availability
- ✅ Профессиональная поддержка

#### Минусы:
- ❌ Дорого
- ❌ Сложная настройка

---

## Frontend деплой

### Вариант A: Vercel (рекомендуется)

1. **Зарегистрируйтесь на [vercel.com](https://vercel.com)**

2. **Подключите GitHub репозиторий**

3. **Настройки деплоя:**
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Деплой:**
   ```bash
   # Локально
   npm run build
   
   # Или автоматически через Git push
   git push origin main
   ```

5. **Получите URL:** `https://your-app.vercel.app`

---

### Вариант B: Netlify

1. **Зарегистрируйтесь на [netlify.com](https://netlify.com)**

2. **Drag & drop папку `dist/`** или подключите Git

3. **Настройки:**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

4. **Получите URL:** `https://your-app.netlify.app`

---

### Вариант C: GitHub Pages

1. **Установите gh-pages:**
   ```bash
   npm install -D gh-pages
   ```

2. **Добавьте в package.json:**
   ```json
   {
     "scripts": {
       "deploy": "gh-pages -d dist"
     },
     "homepage": "https://yourusername.github.io/swypemeal"
   }
   ```

3. **Деплой:**
   ```bash
   npm run build
   npm run deploy
   ```

4. **URL:** `https://yourusername.github.io/swypemeal`

---

### Вариант D: VPS (Nginx)

1. **Подключитесь к серверу:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Установите Nginx:**
   ```bash
   apt update
   apt install nginx
   ```

3. **Скопируйте файлы:**
   ```bash
   # Локально
   npm run build
   scp -r dist/* root@your-server-ip:/var/www/swypemeal/
   ```

4. **Настройте Nginx:**
   ```nginx
   # /etc/nginx/sites-available/swypemeal
   server {
       listen 80;
       server_name your-domain.com;
       
       root /var/www/swypemeal;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # API proxy
       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

5. **Активируйте сайт:**
   ```bash
   ln -s /etc/nginx/sites-available/swypemeal /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   ```

6. **SSL (Let's Encrypt):**
   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx -d your-domain.com
   ```

---

## Backend деплой

### Вариант A: Railway (рекомендуется для начала)

1. **Зарегистрируйтесь на [railway.app](https://railway.app)**

2. **Создайте новый проект:**
   ```bash
   # Установите Railway CLI
   npm i -g @railway/cli
   
   # Войдите
   railway login
   
   # Инициализируйте проект
   railway init
   ```

3. **Деплой:**
   ```bash
   cd backend
   railway up
   ```

4. **Получите URL:** `https://your-backend.up.railway.app`

5. **Обновите frontend:**
   ```typescript
   // В src/api.ts или где у вас API calls
   const API_URL = 'https://your-backend.up.railway.app';
   ```

---

### Вариант B: Render

1. **Зарегистрируйтесь на [render.com](https://render.com)**

2. **Создайте Web Service:**
   - Connect GitHub repository
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Деплой автоматический при push**

---

### Вариант C: VPS (systemd)

1. **Установите Python и зависимости:**
   ```bash
   apt update
   apt install python3 python3-pip python3-venv
   
   cd /opt
   git clone your-repo swypemeal-backend
   cd swypemeal-backend/backend
   
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Создайте systemd service:**
   ```bash
   nano /etc/systemd/system/swypemeal-backend.service
   ```

   ```ini
   [Unit]
   Description=SwypeMeal Backend
   After=network.target
   
   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/swypemeal-backend/backend
   Environment="PATH=/opt/swypemeal-backend/backend/venv/bin"
   ExecStart=/opt/swypemeal-backend/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

3. **Запустите сервис:**
   ```bash
   systemctl daemon-reload
   systemctl enable swypemeal-backend
   systemctl start swypemeal-backend
   systemctl status swypemeal-backend
   ```

4. **Проверьте:**
   ```bash
   curl http://localhost:8000/
   ```

---

### Вариант D: Docker

1. **Создайте Dockerfile:**
   ```dockerfile
   # backend/Dockerfile
   FROM python:3.11-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY . .
   
   EXPOSE 8000
   
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. **Создайте docker-compose.yml:**
   ```yaml
   version: '3.8'
   
   services:
     backend:
       build: ./backend
       ports:
         - "8000:8000"
       volumes:
         - ./backend/data:/app/data
       environment:
         - ENVIRONMENT=production
       restart: always
   ```

3. **Запустите:**
   ```bash
   docker-compose up -d
   ```

---

## Telegram Mini App

### Настройка бота

1. **Создайте бота через [@BotFather](https://t.me/BotFather):**
   ```
   /newbot
   Имя: SwypeMeal Bot
   Username: swypemeal_bot
   ```

2. **Настройте Web App:**
   ```
   /mybots → @swypemeal_bot → Bot Settings → Menu Button
   Configure Menu Button → URL: https://your-domain.com
   ```

3. **Или создайте команду:**
   ```
   /setcommands → @swypemeal_bot
   start - Открыть SwypeMeal
   ```

4. **Добавьте Telegram Web App SDK:**
   ```html
   <!-- Уже добавлено в index.html -->
   <script src="https://telegram.org/js/telegram-web-app.js"></script>
   ```

5. **Инициализация в коде:**
   ```typescript
   // src/utils/telegram.ts
   export const initTelegram = () => {
     if (window.Telegram?.WebApp) {
       const tg = window.Telegram.WebApp;
       tg.ready();
       tg.expand();
       
       // Получите user_id
       const userId = tg.initDataUnsafe?.user?.id;
       return userId;
     }
     return null;
   };
   ```

### Требования для Telegram

- ✅ HTTPS обязательно
- ✅ Свой домен (не vercel.app или netlify.app)
- ✅ CORS настроен на backend
- ✅ Mobile-first дизайн (уже реализовано)

---

## Production рекомендации

### 1. База данных

**Замените file storage на PostgreSQL:**

```python
# backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/swypemeal"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

**Миграции:**
```bash
pip install alembic
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 2. Переменные окружения

```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost/swypemeal
SECRET_KEY=your-secret-key
CORS_ORIGINS=https://your-domain.com
TELEGRAM_BOT_TOKEN=your-bot-token
```

```python
# backend/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    cors_origins: str
    telegram_bot_token: str
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 3. Безопасность

- ✅ HTTPS только
- ✅ Rate limiting
- ✅ Валидация входных данных
- ✅ SQL injection protection (используйте ORM)
- ✅ CORS правильно настроен
- ✅ Secrets в переменных окружения

### 4. Мониторинг

```python
# Добавьте логирование
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### 5. Backup

```bash
# PostgreSQL backup
pg_dump swypemeal > backup_$(date +%Y%m%d).sql

# Автоматический backup (crontab)
0 2 * * * pg_dump swypemeal > /backups/backup_$(date +\%Y\%m\%d).sql
```

### 6. CI/CD

**GitHub Actions:**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Frontend
        run: |
          cd frontend
          npm install
          npm run build
          # Deploy to Vercel/Netlify
      
      - name: Deploy Backend
        run: |
          cd backend
          # SSH deploy или Railway CLI
```

---

## Быстрый старт (5 минут)

### Для тестирования:

1. **Frontend на Vercel:**
   ```bash
   npm run build
   # Drag & drop dist/ на vercel.com
   ```

2. **Backend на Railway:**
   ```bash
   cd backend
   railway up
   ```

3. **Обновите API URL в frontend**

### Для production:

1. **Купите домен** (Namecheap, Reg.ru)
2. **Арендуйте VPS** (DigitalOcean, $5/мес)
3. **Следуйте инструкции VPS + Nginx**
4. **Настройте SSL** (Let's Encrypt)
5. **Настройте PostgreSQL**
6. **Создайте Telegram бота**

---

## Поддержка

- **Документация API:** `https://your-backend.com/docs`
- **Telegram:** [@your_bot](https://t.me/your_bot)
- **Email:** support@your-domain.com

---

## Чеклист перед запуском

- [ ] Frontend задеплоен и работает
- [ ] Backend задеплоен и отвечает
- [ ] HTTPS настроен
- [ ] CORS правильно настроен
- [ ] База данных подключена
- [ ] Telegram бот создан
- [ ] Web App URL указан в боте
- [ ] Переменные окружения настроены
- [ ] Backup настроен
- [ ] Мониторинг настроен
- [ ] Тесты пройдены

---

**Готово! 🎉 Ваше приложение SwypeMeal теперь доступно пользователям!**
