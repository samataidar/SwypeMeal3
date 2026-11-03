# RLS в Supabase

## Текущее состояние

RLS (Row Level Security) в проекте **пока не настроен**:

- `backend/init_db.sql` создаёт таблицы, но не включает RLS и не создаёт политики.
- `backend/fix_rls.sql` и `backend/fix_rls_and_duplicates.sql` — исторические
  скрипты, которые **явно отключают** RLS у `user_roles` и `pending_recipes`.
  Не выполняйте их повторно.
- Backend обращается к Supabase с `service_role` ключом и обходит RLS.
  Изоляция данных сейчас обеспечивается только проверками в `backend/main.py`:
  `get_current_user`, `ensure_user_access`, `require_admin`.

Это означает, что при прямом доступе к Supabase с `anon` ключом ограничения
зависят от политик, которых нет. Для production RLS нужно включить.

## Как правильно включить RLS

1. Убедитесь, что у каждой пользовательской таблицы есть колонка `user_id`
   (или `author_id` для рецептов).
2. Включите RLS:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE swiped_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

3. Добавьте политики для владельца данных:

```sql
CREATE POLICY "own queue" ON queue_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own history" ON history_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own swipes" ON swiped_recipes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

4. Для `user_roles` **нельзя** использовать политику, которая читает
   `user_roles` внутри `USING` — это вызывает бесконечную рекурсию. Вместо
   этого используйте `SECURITY DEFINER` функцию:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE POLICY "read own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
```

5. Для `pending_recipes`:

```sql
CREATE POLICY "author reads own submissions" ON pending_recipes
  FOR SELECT USING (auth.uid() = author_id OR public.is_admin());

CREATE POLICY "author inserts" ON pending_recipes
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "admin moderates" ON pending_recipes
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
```

6. Проверьте, что backend по-прежнему работает: `service_role` обходит RLS,
   поэтому ошибок быть не должно. Затем проверьте доступ с `anon` ключом —
   пользователь должен видеть только свои строки.

## Важно

- Не отключайте RLS ради обхода рекурсии — используйте `SECURITY DEFINER`.
- `service_role` ключ нельзя хранить во frontend.
- После включения RLS прогоните smoke-тесты backend и проверьте вход под двумя
  разными аккаунтами.
