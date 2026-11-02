# 🔧 Исправление OAuth Redirect на Production URL

## Проблема

При входе через Google происходит редирект на preview URL (`swype-meal3-samataidar1.vercel.app`) вместо production URL (`swype-meal3.vercel.app`).

## Решение

### Шаг 1: Настройте Supabase Dashboard

1. Откройте [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/auth/url-configuration)

2. **Site URL** — установите production URL:
   ```
   https://swype-meal3.vercel.app
   ```
   ⚠️ **ВАЖНО:** Без trailing slash!

3. **Redirect URLs** — добавьте все возможные URLs:
   ```
   https://swype-meal3.vercel.app/**
   https://swype-meal3-samataidar1.vercel.app/**
   https://swype-meal3-*.vercel.app/**
   http://localhost:5173/**
   http://localhost:3000/**
   ```

4. Нажмите **Save**

### Шаг 2: Проверьте Google OAuth настройки

1. Перейдите в [Authentication → Providers → Google](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/auth/providers)
2. Убедитесь что **Enable Google provider** включен
3. Проверьте **Redirect URL** — должен быть:
   ```
   https://bbelyefgpptozjfmeyqq.supabase.co/auth/v1/callback
   ```

### Шаг 3: Обновите Google Cloud Console

1. Откройте [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Выберите ваш OAuth 2.0 Client ID для SwypeMeal
3. В разделе **Authorized redirect URIs** добавьте:
   ```
   https://bbelyefgpptozjfmeyqq.supabase.co/auth/v1/callback
   ```
4. В разделе **Authorized JavaScript origins** добавьте:
   ```
   https://swype-meal3.vercel.app
   ```
5. Нажмите **Save**

### Шаг 4: Закоммитьте изменения

```bash
git add src/contexts/AuthContext.tsx
git commit -m "fix: use production URL for OAuth redirect"
git push origin main
```

## Как это работает

### До исправления:
```typescript
redirectTo: window.location.origin
// Возвращает: https://swype-meal3-samataidar1.vercel.app (preview URL)
```

### После исправления:
```typescript
const redirectTo = import.meta.env.PROD 
  ? 'https://swype-meal3.vercel.app'  // Production URL
  : window.location.origin;           // Local development
```

## Проверка

После настройки:

1. Откройте https://swype-meal3.vercel.app на новом устройстве
2. Нажмите "Войти через Google"
3. Должен произойти редирект на Google OAuth
4. После входа редирект обратно на `https://swype-meal3.vercel.app` (НЕ на preview URL)
5. Сессия сохраняется

## Разница между URLs

| URL | Тип | Доступ |
|-----|-----|--------|
| `swype-meal3.vercel.app` | Production | ✅ Всем |
| `swype-meal3-samataidar1.vercel.app` | Preview | 🔒 Только владельцу Vercel аккаунта |

## Troubleshooting

### Ошибка: "Redirect URL not allowed"

**Причина:** URL не добавлен в Redirect URLs

**Решение:**
1. Откройте Supabase Dashboard → Authentication → URL Configuration
2. Добавьте URL из ошибки в Redirect URLs

### Ошибка: "Invalid OAuth redirect"

**Причина:** Site URL не настроен

**Решение:**
1. Установите Site URL = `https://swype-meal3.vercel.app`
2. Убедитесь что нет trailing slash

### Редирект на preview URL

**Причина:** Site URL установлен на preview URL

**Решение:**
1. Измените Site URL на `https://swype-meal3.vercel.app`
2. Добавьте preview URLs в Redirect URLs

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
const redirectTo = import.meta.env.PROD 
  ? 'https://swype-meal3.vercel.app' 
  : window.location.origin;
```

## Готово!

После выполнения всех шагов OAuth будет работать на всех устройствах с production URL.
