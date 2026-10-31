# 🔧 Настройка OAuth для работы на всех устройствах

## Проблема

При входе через Google на новом устройстве происходит редирект на временный URL Vercel (например, `swype-meal3-samataidar1.vercel.app`) вместо основного домена.

## Решение

### Шаг 1: Настройте Site URL в Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/auth/url-configuration)
2. Перейдите в **Authentication** → **URL Configuration**
3. Найдите раздел **Site URL**
4. Установите значение:
   ```
   https://swype-meal3.vercel.app
   ```
5. Нажмите **Save**

### Шаг 2: Добавьте Redirect URLs

1. В том же разделе найдите **Redirect URLs**
2. Добавьте все возможные URLs:
   ```
   https://swype-meal3.vercel.app/**
   https://swype-meal3.vercel.app
   https://swype-meal3-samataidar1.vercel.app/**
   https://swype-meal3-*.vercel.app/**
   http://localhost:5173/**
   http://localhost:5173
   ```
3. Нажмите **Save**

### Шаг 3: Проверьте Google OAuth настройки

1. Перейдите в **Authentication** → **Providers** → **Google**
2. Убедитесь что **Enable Google provider** включен
3. Проверьте **Redirect URL** - он должен быть:
   ```
   https://bbelyefgpptozjfmeyqq.supabase.co/auth/v1/callback
   ```

### Шаг 4: Обновите Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Выберите ваш OAuth 2.0 Client ID
3. В разделе **Authorized redirect URIs** добавьте:
   ```
   https://bbelyefgpptozjfmeyqq.supabase.co/auth/v1/callback
   ```
4. В разделе **Authorized JavaScript origins** добавьте:
   ```
   https://swype-meal3.vercel.app
   https://swype-meal3-samataidar1.vercel.app
   ```
5. Нажмите **Save**

### Шаг 5: Закоммитьте изменения

```bash
git add src/lib/supabase.ts
git commit -m "fix: configure Supabase auth for multi-device support"
git push origin main
```

## Как это работает

### Site URL
- Основной URL вашего приложения
- Используется для редиректа после входа
- Должен быть постоянным (не preview URL)

### Redirect URLs
- Список разрешенных URL для OAuth callback
- Поддерживает wildcard (`*`) для preview URLs
- Vercel создаёт preview URLs для каждого деплоя

### Auth Configuration
```typescript
{
  auth: {
    autoRefreshToken: true,    // Автоматическое обновление токена
    persistSession: true,       // Сохранение сессии в localStorage
    detectSessionInUrl: true    // Обнаружение сессии в URL (для OAuth callback)
  }
}
```

## Проверка

После настройки:

1. Откройте https://swype-meal3.vercel.app на новом устройстве
2. Нажмите "Войти через Google"
3. Должен произойти редирект на Google OAuth
4. После входа редирект обратно на `https://swype-meal3.vercel.app`
5. Сессия должна сохраниться

## Troubleshooting

### Ошибка: "Redirect URL not allowed"

**Причина:** Redirect URL не добавлен в Supabase

**Решение:**
1. Проверьте Redirect URLs в Supabase Dashboard
2. Добавьте URL из ошибки в список разрешенных

### Ошибка: "Invalid OAuth redirect"

**Причина:** Site URL не настроен

**Решение:**
1. Установите Site URL в Supabase Dashboard
2. Убедитесь что URL точный (без trailing slash)

### Сессия не сохраняется

**Причина:** `persistSession: false` или проблемы с localStorage

**Решение:**
1. Проверьте что `persistSession: true` в конфигурации
2. Очистите localStorage и попробуйте снова
3. Проверьте что браузер не блокирует cookies

### Редирект на preview URL

**Причина:** Site URL установлен на preview URL

**Решение:**
1. Измените Site URL на `https://swype-meal3.vercel.app`
2. Добавьте preview URLs в Redirect URLs

## Дополнительные настройки Vercel

### Environment Variables

Убедитесь что переменные окружения настроены:

```bash
VITE_SUPABASE_URL=https://bbelyefgpptozjfmeyqq.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Domain Settings

1. Откройте Vercel Dashboard
2. Выберите проект
3. Перейдите в **Settings** → **Domains**
4. Убедитесь что `swype-meal3.vercel.app` является production domain

## Безопасность

### Что безопасно

✅ Использование wildcard в Redirect URLs для preview  
✅ Хранение anon key в frontend (это публичный ключ)  
✅ Auto-refresh токенов  

### Что НЕ безопасно

❌ Хранение service_role key в frontend  
❌ Отключение persistSession (пользователи будут выходить при перезагрузке)  
❌ Использование http:// в production  

## Итоговая конфигурация

### Supabase Dashboard

```
Site URL: https://swype-meal3.vercel.app
Redirect URLs:
  - https://swype-meal3.vercel.app/**
  - https://swype-meal3-samataidar1.vercel.app/**
  - https://swype-meal3-*.vercel.app/**
  - http://localhost:5173/**
```

### Frontend Code

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

### Google Cloud Console

```
Authorized redirect URIs:
  - https://bbelyefgpptozjfmeyqq.supabase.co/auth/v1/callback

Authorized JavaScript origins:
  - https://swype-meal3.vercel.app
  - https://swype-meal3-samataidar1.vercel.app
```

## Готово!

После выполнения всех шагов OAuth будет работать на всех устройствах с любым Google аккаунтом.
