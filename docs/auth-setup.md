# 🔐 Настройка аутентификации через Google OAuth

## ✅ Что было добавлено

- ✅ Аутентификация через Google OAuth
- ✅ Страница входа с кнопкой "Войти через Google"
- ✅ Защита приложения (редирект на страницу входа)
- ✅ Аватар и имя пользователя в header
- ✅ Кнопка выхода из аккаунта
- ✅ Синхронизация данных по user_id из Supabase Auth

---

## 🚀 Настройка Google OAuth в Supabase (10 минут)

### Шаг 1: Создайте проект в Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект (или выберите существующий):
   - Название: `SwypeMeal`
   - Organization: ваша организация (или Personal)

3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **Create Credentials** → **OAuth client ID**
5. Если появится предупреждение о consent screen:
   - Нажмите **Configure consent screen**
   - Выберите **External** → **Create**
   - Заполните:
     - **App name**: `SwypeMeal`
     - **User support email**: ваш email
     - **Developer contact information**: ваш email
   - Нажмите **Save and Continue** → **Save and Continue** → **Back to Dashboard**

6. Снова нажмите **Create Credentials** → **OAuth client ID**
7. Заполните:
   - **Application type**: `Web application`
   - **Name**: `SwypeMeal Web`
   - **Authorized JavaScript origins**:
     ```
     https://swype-meal3.vercel.app
     http://localhost:5173
     ```
   - **Authorized redirect URIs**:
     ```
     https://bbelyefgpptozjfmeyqq.supabase.co/auth/v1/callback
     ```
8. Нажмите **Create**
9. Скопируйте **Client ID** и **Client Secret** (понадобятся на шаге 2)

---

### Шаг 2: Настройте Google Provider в Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/auth/providers)
2. Перейдите в **Authentication** → **Providers**
3. Найдите **Google** и нажмите **Expand**
4. Включите переключатель **Enable**
5. Заполните:
   - **Client ID**: вставьте Client ID из Google Cloud Console
   - **Client Secret**: вставьте Client Secret из Google Cloud Console
6. Нажмите **Save**

---

### Шаг 3: Получите Anon Key

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/bbelyefgpptozjfmeyqq/settings/api)
2. Перейдите в **Settings** → **API**
3. Найдите раздел **Project API keys**
4. Скопируйте **anon public** key

---

### Шаг 4: Добавьте переменные окружения на Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект (swype-meal3)
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте две переменные:

**Переменная 1:**
| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://bbelyefgpptozjfmeyqq.supabase.co` |

**Переменная 2:**
| Key | Value |
|-----|-------|
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (ваш anon key) |

5. Нажмите **Save**
6. Перейдите в **Deployments** → **Redeploy** (чтобы применить изменения)

---

### Шаг 5: Закоммитьте и запушьте изменения

```bash
git add .
git commit -m "feat: Add Google OAuth authentication"
git push origin main
```

Vercel автоматически задеплоит новую версию.

---

## ✅ Проверка

После деплоя:

1. Откройте https://swype-meal3.vercel.app/
2. Должна появиться страница входа с кнопкой "Войти через Google"
3. Нажмите кнопку → откроется окно авторизации Google
4. Выберите аккаунт → произойдёт редирект обратно в приложение
5. В header должен появиться аватар и кнопка выхода

---

## 🔍 Как это работает

### Архитектура аутентификации

```
┌──────────────┐
│   Frontend   │
│   (Vercel)   │
│              │
│  AuthContext │ ← Управляет состоянием авторизации
│  LoginPage   │ ← Страница входа
│  Protected   │ ← Защита роутов
│  Routes      │
└──────┬───────┘
       │
       │ OAuth Flow
       │
┌──────▼───────┐
│   Supabase   │
│     Auth     │
│              │
│  Google OAuth│ ← Провайдер аутентификации
│  JWT Tokens  │
│  User Data   │
└──────────────┘
```

### Поток авторизации

1. Пользователь нажимает "Войти через Google"
2. Frontend перенаправляет на Google OAuth
3. Пользователь авторизуется в Google
4. Google перенаправляет обратно в Supabase
5. Supabase создаёт JWT токен
6. Frontend получает токен и сохраняет в localStorage
7. Приложение показывает аватар и имя пользователя
8. Все API запросы используют user_id из Supabase Auth

---

## 📊 Структура данных

### Таблица users (автоматически создаётся Supabase Auth)

```sql
-- Supabase Auth автоматически создаёт пользователей в auth.users
-- Мы используем user.id для связи с нашими таблицами

-- Пример записи:
-- id: "123e4567-e89b-12d3-a456-426614174000"
-- email: "user@gmail.com"
-- raw_user_meta_data: { "avatar_url": "...", "full_name": "..." }
```

### Использование user_id в API

```typescript
// В store.ts
const userId = api.getUserId(); // Получаем user_id из Supabase Auth

// Все API запросы используют этот userId
api.addToQueue(userId, recipeId);
api.getQueue(userId);
```

---

## 🎨 Компоненты

### AuthContext.tsx

Управляет состоянием авторизации:
- `user` — текущий пользователь
- `session` — сессия Supabase
- `loading` — состояние загрузки
- `signInWithGoogle()` — вход через Google
- `signOut()` — выход

### LoginPage.tsx

Страница входа:
- Красивый дизайн с градиентом
- Кнопка "Войти через Google"
- Иконки фич приложения
- Анимации

### App.tsx

Защита роутов:
- Проверка авторизации при загрузке
- Редирект на LoginPage если не авторизован
- Отображение аватара в header
- Кнопка выхода

---

## 🐛 Troubleshooting

### Ошибка: "Invalid redirect_uri"

**Причина:** Redirect URI не совпадает

**Решение:**
1. Проверьте в Google Cloud Console:
   - Authorized redirect URIs: `https://bbelyefgpptozjfmeyqq.supabase.co/auth/v1/callback`
2. Проверьте в Supabase:
   - Site URL: `https://swype-meal3.vercel.app`

---

### Ошибка: "OAuth provider not enabled"

**Причина:** Google provider не включён в Supabase

**Решение:**
1. Откройте Supabase Dashboard → Authentication → Providers
2. Включите Google provider
3. Добавьте Client ID и Client Secret

---

### Ошибка: "Invalid API key"

**Причина:** Неправильный VITE_SUPABASE_ANON_KEY

**Решение:**
1. Проверьте переменные окружения на Vercel
2. Убедитесь, что используете **anon public** key (не service_role)
3. Redeploy после изменения переменных

---

### Пользователь не перенаправляется после входа

**Причина:** Проблема с redirect URL

**Решение:**
1. Проверьте Site URL в Supabase:
   - Settings → API → Site URL: `https://swype-meal3.vercel.app`
2. Проверьте redirect в коде:
   ```typescript
   redirectTo: window.location.origin
   ```

---

## 🔐 Безопасность

### Что безопасно

✅ **Anon key** — можно использовать в frontend (публичный)  
✅ **JWT токены** — автоматически обновляются Supabase  
✅ **Row Level Security (RLS)** — можно настроить в Supabase  

### Что НЕ безопасно

❌ **Service role key** — никогда не используйте в frontend  
❌ **Хранение паролей** — используйте только OAuth  
❌ **Передача токенов в URL** — используйте headers  

---

## 📋 Чеклист

- [ ] Создан проект в Google Cloud Console
- [ ] Настроен OAuth consent screen
- [ ] Создан OAuth client ID
- [ ] Добавлены Authorized JavaScript origins
- [ ] Добавлены Authorized redirect URIs
- [ ] Скопированы Client ID и Client Secret
- [ ] Включён Google provider в Supabase
- [ ] Добавлены Client ID и Client Secret в Supabase
- [ ] Скопирован anon public key из Supabase
- [ ] Добавлены переменные окружения на Vercel
- [ ] Redeploy на Vercel
- [ ] Закоммичены изменения
- [ ] Запушено в main
- [ ] Проверена страница входа
- [ ] Проверен вход через Google
- [ ] Проверен выход из аккаунта

---

## 🎯 Следующие шаги

После успешной настройки:

1. **Настройте Row Level Security (RLS)** в Supabase для защиты данных
2. **Добавьте профили пользователей** с дополнительной информацией
3. **Интегрируйте с Telegram Mini App** (используйте Telegram Auth)
4. **Добавьте другие OAuth провайдеры** (GitHub, Facebook, Apple)

---

## 📚 Документация

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Готово! Ваше приложение теперь защищено аутентификацией через Google OAuth!** 🎉
