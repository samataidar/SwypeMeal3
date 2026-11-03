# RLS в Supabase

## Текущее состояние

Готов идемпотентный скрипт **`backend/enable_rls.sql`**: он включает RLS на всех
таблицах и создаёт политики. Его нужно один раз выполнить в Supabase SQL Editor.

Что уже сделано в коде:

- `backend/init_db.sql` и `backend/add_roles.sql` теперь включают RLS при
  создании таблиц (secure by default).
- `backend/fix_rls.sql` и `backend/fix_rls_and_duplicates.sql` больше **не
  отключают** RLS — они помечены как исторические и оставлены только ради
  функций upsert и очистки дубликатов.
- Backend ходит с `service_role`, который обходит RLS, поэтому его работа от
  включения RLS не зависит.
- Изоляция на уровне API дополнительно обеспечивается проверками
  `get_current_user`, `ensure_user_access`, `require_admin` в `backend/main.py`.

## Как применить

1. Откройте Supabase → SQL Editor.
2. Вставьте содержимое `backend/enable_rls.sql` и выполните.
3. Убедитесь по последним запросам из скрипта, что `rowsecurity = true` у всех
   восьми таблиц и политики созданы.

Скрипт можно запускать повторно: все политики создаются через
`drop policy if exists` + `create policy`.

## Модель доступа

| Таблица | anon | authenticated | service_role |
|---|---|---|---|
| `recipes` | только `status='approved'` | одобренные + свои (`author_id`) | всё |
| `pending_recipes` | — | свои (`author_id`), INSERT только со `status='pending'` | всё |
| `user_roles` | — | только своя строка | всё |
| `users` | — | своя строка, UPDATE своей | всё |
| `queue_items` | — | CRUD по своим `user_id` | всё |
| `history_items` | — | CRUD по своим `user_id` | всё |
| `swiped_recipes` | — | CRUD по своим `user_id` | всё |
| `user_preferences` | — | CRUD по своим `user_id` | всё |

Важные решения:

- **Запись в `recipes` и `user_roles` из клиента запрещена.** Публикация рецептов
  идёт через модерацию (`pending_recipes` → backend), роли назначает только
  backend. Так нельзя «самому одобрить» рецепт или выдать себе `admin`.
- **Все id в таблицах — `TEXT`**, а `auth.uid()` возвращает `uuid`, поэтому в
  политиках везде сравнение `auth.uid()::text = user_id` (без приведения
  Postgres падает на сравнении типов).
- Политики `user_roles` не читают `user_roles` внутри `USING`, поэтому
  рекурсии нет и `SECURITY DEFINER`-функции не требуются: админ-операции всё
  равно выполняет backend.

## Проверка после включения

```bash
# 1. Backend работает как раньше (service_role обходит RLS)
curl https://swypemeal.ru/api/health
# ожидается: {"status":"healthy","database":"connected","supabase_key_role":"service_role"}

# 2. Прямой доступ anon-ключом должен вернуть только разрешённые строки:
#    для queue_items без JWT — пустой массив, а не чужие данные.
curl "https://<project>.supabase.co/rest/v1/queue_items?select=*" \
  -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>"
```

Если `health` вернул `"supabase_key_role":"anon"` и `"status":"unhealthy"` —
на backend стоит anon-ключ. С включённым RLS он видит пустые таблицы и не может
писать: в приложении данные «сбрасываются» после перезагрузки. Поставьте в
Render → Environment `SUPABASE_KEY` = **service_role** и перезапустите сервис.

И в приложении:

1. Войти под первым аккаунтом — очередь/история/свайпы на месте.
2. Выйти, войти под вторым — данные первого не видны (проверяет и RLS, и
   пользовательский `localStorage`: ключи вида `swypemeal:<user_id>:queue`).
3. Повторить свайп/готовку — записи сохраняются.

## Важно

- `service_role` ключ нельзя хранить во frontend.
- Не отключайте RLS ради обхода ошибок — проверяйте политики.
- Если добавляете новую пользовательскую таблицу, добавьте её в
  `backend/enable_rls.sql` (RLS + политики `auth.uid()::text = user_id`).
