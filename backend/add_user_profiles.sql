-- Профили пользователей и авторство рецептов.
--
-- Выполните этот файл в Supabase SQL Editor. Скрипт идемпотентный.
--
-- Зачем:
--   * email и имя приходят от Google OAuth в токене Supabase — сохраняем их
--     в public.users, чтобы показывать автора и не запрашивать профиль каждый раз;
--   * email остаётся приватным: RLS на users разрешает читать только свою строку;
--   * на рецепте хранится только публичное отображаемое имя (author_name),
--     поэтому чужой email через recipes не утекает.

alter table public.users add column if not exists email text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists avatar_url text;

-- Денормализованное имя автора: попадает в публичную таблицу рецептов.
alter table public.recipes add column if not exists author_name text;

-- Имя автора для админской очереди модерации (не публично).
alter table public.pending_recipes add column if not exists author_name text;

-- Проверка
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'users' and column_name in ('email', 'full_name', 'avatar_url'))
    or (table_name = 'recipes' and column_name = 'author_name')
    or (table_name = 'pending_recipes' and column_name = 'author_name')
  )
order by table_name, column_name;
