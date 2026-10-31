-- Обновить изображения рецептов на URL
-- Выполните этот SQL в Supabase SQL Editor

UPDATE recipes SET image = 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&h=600&fit=crop' WHERE id = '1';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=800&h=600&fit=crop' WHERE id = '2';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop' WHERE id = '3';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&h=600&fit=crop' WHERE id = '4';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=600&fit=crop' WHERE id = '5';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop' WHERE id = '6';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&h=600&fit=crop' WHERE id = '7';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=600&fit=crop' WHERE id = '8';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=600&fit=crop' WHERE id = '9';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1528207776951-a57141f2eefd?w=800&h=600&fit=crop' WHERE id = '10';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=600&fit=crop' WHERE id = '11';
UPDATE recipes SET image = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop' WHERE id = '12';

-- Проверка
SELECT id, title, image FROM recipes ORDER BY id;
