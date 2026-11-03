-- ============================================================
-- SwypeMeal: включаем RLS и задаём политики доступа.
--
-- Выполните этот файл в Supabase SQL Editor (или через Supabase CLI).
-- Скрипт идемпотентный: его можно запускать повторно.
--
-- Почему это нужно:
--   * backend ходит в Supabase с service_role и RLS обходит — для него
--     политики ничего не меняют;
--   * прямой доступ клиента (anon / authenticated) должен видеть только
--     свои строки. Без RLS любой, у кого есть anon-ключ, читает и меняет
--     чужие очередь, историю, свайпы и настройки;
--   * политики также работают как defense-in-depth, если ключ утечёт.
--
-- Важно: все id в наших таблицах TEXT, а auth.uid() возвращает uuid,
-- поэтому везде сравниваем auth.uid()::text с колонкой.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Включаем RLS на всех таблицах
-- ------------------------------------------------------------
alter table public.users            enable row level security;
alter table public.recipes          enable row level security;
alter table public.queue_items      enable row level security;
alter table public.history_items    enable row level security;
alter table public.swiped_recipes   enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_roles       enable row level security;
alter table public.pending_recipes  enable row level security;

-- ------------------------------------------------------------
-- 2. users — только своя строка
-- ------------------------------------------------------------
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
    for select to authenticated
    using (auth.uid()::text = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
    for update to authenticated
    using (auth.uid()::text = id)
    with check (auth.uid()::text = id);

-- ------------------------------------------------------------
-- 3. recipes — читают все одобренные; запись только через backend
--    (модерация и публикация идут через service_role).
-- ------------------------------------------------------------
drop policy if exists "recipes_select_approved" on public.recipes;
create policy "recipes_select_approved" on public.recipes
    for select to anon, authenticated
    using (status = 'approved' or author_id = auth.uid()::text);

-- ------------------------------------------------------------
-- 4. pending_recipes — автор видит и создаёт только свои
-- ------------------------------------------------------------
drop policy if exists "pending_recipes_select_own" on public.pending_recipes;
create policy "pending_recipes_select_own" on public.pending_recipes
    for select to authenticated
    using (author_id = auth.uid()::text);

drop policy if exists "pending_recipes_insert_own" on public.pending_recipes;
create policy "pending_recipes_insert_own" on public.pending_recipes
    for insert to authenticated
    with check (author_id = auth.uid()::text and status = 'pending');

-- ------------------------------------------------------------
-- 5. user_roles — пользователь видит только свою роль.
--    Назначает роли только backend (service_role).
-- ------------------------------------------------------------
drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
    for select to authenticated
    using (auth.uid()::text = user_id);

-- ------------------------------------------------------------
-- 6. Пользовательские данные: полный CRUD только по своим строкам
-- ------------------------------------------------------------
drop policy if exists "queue_items_select_own" on public.queue_items;
create policy "queue_items_select_own" on public.queue_items
    for select to authenticated
    using (auth.uid()::text = user_id);

drop policy if exists "queue_items_insert_own" on public.queue_items;
create policy "queue_items_insert_own" on public.queue_items
    for insert to authenticated
    with check (auth.uid()::text = user_id);

drop policy if exists "queue_items_update_own" on public.queue_items;
create policy "queue_items_update_own" on public.queue_items
    for update to authenticated
    using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

drop policy if exists "queue_items_delete_own" on public.queue_items;
create policy "queue_items_delete_own" on public.queue_items
    for delete to authenticated
    using (auth.uid()::text = user_id);

drop policy if exists "history_items_select_own" on public.history_items;
create policy "history_items_select_own" on public.history_items
    for select to authenticated
    using (auth.uid()::text = user_id);

drop policy if exists "history_items_insert_own" on public.history_items;
create policy "history_items_insert_own" on public.history_items
    for insert to authenticated
    with check (auth.uid()::text = user_id);

drop policy if exists "history_items_update_own" on public.history_items;
create policy "history_items_update_own" on public.history_items
    for update to authenticated
    using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

drop policy if exists "history_items_delete_own" on public.history_items;
create policy "history_items_delete_own" on public.history_items
    for delete to authenticated
    using (auth.uid()::text = user_id);

drop policy if exists "swiped_recipes_select_own" on public.swiped_recipes;
create policy "swiped_recipes_select_own" on public.swiped_recipes
    for select to authenticated
    using (auth.uid()::text = user_id);

drop policy if exists "swiped_recipes_insert_own" on public.swiped_recipes;
create policy "swiped_recipes_insert_own" on public.swiped_recipes
    for insert to authenticated
    with check (auth.uid()::text = user_id);

drop policy if exists "swiped_recipes_update_own" on public.swiped_recipes;
create policy "swiped_recipes_update_own" on public.swiped_recipes
    for update to authenticated
    using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

drop policy if exists "swiped_recipes_delete_own" on public.swiped_recipes;
create policy "swiped_recipes_delete_own" on public.swiped_recipes
    for delete to authenticated
    using (auth.uid()::text = user_id);

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own" on public.user_preferences
    for select to authenticated
    using (auth.uid()::text = user_id);

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own" on public.user_preferences
    for insert to authenticated
    with check (auth.uid()::text = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own" on public.user_preferences
    for update to authenticated
    using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

drop policy if exists "user_preferences_delete_own" on public.user_preferences;
create policy "user_preferences_delete_own" on public.user_preferences
    for delete to authenticated
    using (auth.uid()::text = user_id);

-- ------------------------------------------------------------
-- 7. Права ролей (RLS сужает их до своих строк)
-- ------------------------------------------------------------
grant select on public.recipes to anon, authenticated;
grant select on public.users to authenticated;
grant update (created_at, updated_at) on public.users to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert on public.pending_recipes to authenticated;
grant select, insert, update, delete on public.queue_items to authenticated;
grant select, insert, update, delete on public.history_items to authenticated;
grant select, insert, update, delete on public.swiped_recipes to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

-- ------------------------------------------------------------
-- 8. Проверка: RLS включён и политики на месте
-- ------------------------------------------------------------
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'users', 'recipes', 'queue_items', 'history_items',
    'swiped_recipes', 'user_preferences', 'user_roles', 'pending_recipes'
  )
order by tablename;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
