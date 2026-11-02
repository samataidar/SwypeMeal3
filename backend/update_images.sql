-- Обновить изображения базовых рецептов.
-- Выполните этот SQL в Supabase SQL Editor (Dashboard -> SQL Editor).
--
-- Почему локальные пути (/images/*.jpg):
--   Внешние CDN (images.unsplash.com, upload.wikimedia.org) блокируются в России,
--   что вызывает ERR_CONNECTION_RESET. Изображения лежат в public/images/ и
--   отдаются тем же доменом, что и приложение (swypemeal.ru / vercel).
--   Если у вас уже есть фото в Cloudinary (cloud name: ylksrnxy), замените
--   значения на https://res.cloudinary.com/ylksrnxy/image/upload/w_800,h_600,c_fill,q_auto,f_jpg/<public_id>.

UPDATE recipes SET image = '/images/carbonara.jpg' WHERE id = '1';
UPDATE recipes SET image = '/images/tom-yum.jpg' WHERE id = '2';
UPDATE recipes SET image = '/images/bowl.jpg' WHERE id = '3';
UPDATE recipes SET image = '/images/risotto.jpg' WHERE id = '4';
UPDATE recipes SET image = '/images/taco.jpg' WHERE id = '5';
UPDATE recipes SET image = '/images/salmon.jpg' WHERE id = '6';
UPDATE recipes SET image = '/images/shawarma.jpg' WHERE id = '7';
UPDATE recipes SET image = '/images/tiramisu.jpg' WHERE id = '8';
UPDATE recipes SET image = '/images/tom-kha.jpg' WHERE id = '9';
UPDATE recipes SET image = '/images/pancakes.jpg' WHERE id = '10';
UPDATE recipes SET image = '/images/curry.jpg' WHERE id = '11';
UPDATE recipes SET image = '/images/steak.jpg' WHERE id = '12';

-- Проверка
SELECT id, title, image FROM recipes ORDER BY id;
