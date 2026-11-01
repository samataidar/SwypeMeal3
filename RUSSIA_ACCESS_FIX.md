# 🇷🇺 Решение проблемы с блокировкой в России

## Проблема

Домены `*.vercel.app` и `*.supabase.co` периодически блокируются в России.

## ✅ Решение 1: Кастомный домен (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Купите домен

**Рекомендуемые регистраторы:**
- [Reg.ru](https://reg.ru) — от 199₽/год (.ru домены)
- [Beget](https://beget.com) — от 250₽/год (.ru домены)
- [Namecheap](https://namecheap.com) — от $8.88/год (.com домены)

**Примеры доменов:**
- `swypemeal.ru` (~199₽/год)
- `swypemeal.com` (~700₽/год)
- `swype-meal.ru` (~199₽/год)

### Шаг 2: Подключите домен к Vercel

1. Откройте [Vercel Dashboard → ваш проект → Settings → Domains](https://vercel.com/dashboard)

2. Введите ваш домен: `swypemeal.ru`

3. Vercel покажет DNS записи. Добавьте их у регистратора:

**Для поддомена www:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Для корневого домена:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Для Reg.ru:**
1. Войдите в личный кабинет
2. Перейдите в "Мои домены" → выберите ваш домен
3. Нажмите "DNS-записи" или "Управление DNS"
4. Добавьте записи из пункта 3
5. Сохраните

**Для Beget:**
1. Войдите в панель управления
2. Перейдите в "Домены" → выберите ваш домен
3. Нажмите "DNS"
4. Добавьте записи
5. Сохраните

4. Подождите 5-30 минут (обновление DNS)

5. Vercel автоматически настроит SSL сертификат

### Шаг 3: Обновите Supabase

1. Откройте [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/auth/url-configuration)

2. Измените **Site URL**:
   ```
   https://swypemeal.ru
   ```

3. Добавьте в **Redirect URLs**:
   ```
   https://swypemeal.ru/**
   ```

4. Нажмите **Save**

### Шаг 4: Добавьте переменную окружения на Vercel

1. Откройте [Vercel Dashboard → ваш проект → Settings → Environment Variables](https://vercel.com/dashboard)

2. Добавьте переменную:
   - **Key:** `VITE_SITE_URL`
   - **Value:** `https://swypemeal.ru`

3. Выберите окружения: Production, Preview, Development

4. Нажмите **Save**

5. Redeploy проект (Deployments → ⋮ → Redeploy)

### Шаг 5: Закоммитьте изменения

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: support custom domain via environment variable"
git push origin main
```

### Шаг 6: Проверьте

1. Откройте `https://swypemeal.ru` с телефона без VPN
2. Сайт должен открыться
3. OAuth через Google должен работать

---

## ✅ Решение 2: Cloudflare Pages (альтернатива Vercel)

Если не хотите покупать домен, используйте Cloudflare Pages:

### Шаг 1: Зарегистрируйтесь на Cloudflare

1. Откройте [cloudflare.com](https://cloudflare.com)
2. Зарегистрируйтесь (бесплатно)

### Шаг 2: Создайте проект

1. Перейдите в **Workers & Pages** → **Create** → **Pages**
2. Выберите **Connect to Git**
3. Подключите GitHub репозиторий SwypeMeal

### Шаг 3: Настройте сборку

```
Framework preset: Vite
Build command: npm run build
Build output directory: dist
```

### Шаг 4: Добавьте переменные окружения

В разделе **Environment variables** добавьте:
```
VITE_SUPABASE_URL=https://bbelyefgpptozjfmeyqq.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://swypemeal.onrender.com
```

### Шаг 5: Deploy

Нажмите **Save and Deploy**

Получите URL вида: `swypemeal.pages.dev`

**Преимущества Cloudflare:**
- ✅ Обычно доступен в России
- ✅ Бесплатный SSL
- ✅ Быстрый CDN
- ✅ 100 ГБ трафика бесплатно

---

## ✅ Решение 3: Самохостинг (для продвинутых)

Если хотите полный контроль:

### Шаг 1: Арендуйте VPS в России

**Рекомендуемые хостинги:**
- [Timeweb](https://timeweb.com) — от 200₽/мес
- [Beget](https://beget.com) — от 150₽/мес
- [Reg.ru VPS](https://reg.ru) — от 300₽/мес

### Шаг 2: Установите Node.js и Nginx

```bash
# На сервере
sudo apt update
sudo apt install nodejs npm nginx

# Клонируйте репозиторий
git clone https://github.com/yourusername/swypemeal.git
cd swypemeal

# Установите зависимости
npm install

# Соберите проект
npm run build
```

### Шаг 3: Настройте Nginx

```nginx
server {
    listen 80;
    server_name swypemeal.ru;

    root /var/www/swypemeal/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Шаг 4: Настройте SSL

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d swypemeal.ru
```

---

## 🔧 Решение 4: Прокси для Supabase

Если проблема только с Supabase, можно использовать прокси:

### Шаг 1: Создайте прокси на Cloudflare Workers

1. Откройте [Cloudflare Workers](https://workers.cloudflare.com)
2. Создайте новый Worker
3. Вставьте код:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const supabaseUrl = 'https://bbelyefgpptozjfmeyqq.supabase.co';
    
    // Проксируем запросы к Supabase
    const targetUrl = supabaseUrl + url.pathname + url.search;
    
    return fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
  },
};
```

4. Deploy Worker
5. Получите URL вида: `supabase-proxy.your-subdomain.workers.dev`

### Шаг 2: Используйте прокси в frontend

Добавьте переменную окружения на Vercel:
```
VITE_SUPABASE_PROXY=https://supabase-proxy.your-subdomain.workers.dev
```

---

## 📊 Сравнение решений

| Решение | Стоимость | Сложность | Надежность |
|---------|-----------|-----------|------------|
| Кастомный домен | 200-700₽/год | ⭐ Легко | ⭐⭐⭐ Отлично |
| Cloudflare Pages | Бесплатно | ⭐⭐ Средне | ⭐⭐ Хорошо |
| Самохостинг | 200-500₽/мес | ⭐⭐⭐ Сложно | ⭐⭐⭐ Отлично |
| Прокси для Supabase | Бесплатно | ⭐⭐ Средне | ⭐ Средне |

---

## 🎯 Рекомендуемый план действий

### Быстрое решение (5 минут):
1. Купите домен `swypemeal.ru` на Reg.ru (~199₽)
2. Подключите к Vercel
3. Обновите Supabase
4. Готово!

### Бесплатное решение (30 минут):
1. Зарегистрируйтесь на Cloudflare
2. Создайте проект на Cloudflare Pages
3. Подключите GitHub
4. Готово!

---

## 🔍 Проверка доступности

После настройки проверьте сайт:

1. **Без VPN:**
   ```
   https://swypemeal.ru
   ```

2. **С VPN (если нужно):**
   ```
   https://swypemeal.ru
   ```

3. **На телефоне:**
   - Откройте в браузере
   - Должно работать без VPN

---

## 🐛 Troubleshooting

### Сайт всё ещё не открывается

**Проверьте:**
1. DNS записи добавлены правильно
2. Прошло 5-30 минут (обновление DNS)
3. SSL сертификат настроен (должен быть зеленый замочек)

**Инструменты проверки:**
- [DNS Checker](https://dnschecker.org) — проверка DNS записей
- [SSL Labs](https://www.ssllabs.com/ssltest/) — проверка SSL

### OAuth не работает после смены домена

**Решение:**
1. Обновите Site URL в Supabase
2. Добавьте новый домен в Redirect URLs
3. Добавьте переменную `VITE_SITE_URL` на Vercel
4. Redeploy проект

### Домен не привязывается к Vercel

**Решение:**
1. Проверьте DNS записи
2. Убедитесь что нет конфликтующих записей
3. Подождите до 48 часов (максимальное время обновления DNS)

---

## 📚 Полезные ссылки

- [Vercel: Adding Domains](https://vercel.com/docs/projects/domains/add-a-domain)
- [Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Cloudflare Pages](https://pages.cloudflare.com)
- [Reg.ru DNS](https://www.reg.ru/support/help/api2)

---

## ✅ Итог

**Самое простое и надежное решение:**
1. Купите домен `swypemeal.ru` (~199₽/год)
2. Подключите к Vercel
3. Обновите настройки Supabase
4. Готово!

После этого сайт будет доступен в России без VPN на всех устройствах.
