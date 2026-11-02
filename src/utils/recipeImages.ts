/**
 * Резервные (fallback) изображения для рецептов.
 *
 * Почему это нужно:
 *   Изображения из `images.unsplash.com`, `upload.wikimedia.org` и других
 *   внешних CDN периодически недоступны (ERR_CONNECTION_RESET).
 *   Поэтому у каждого рецепта есть локальный файл из `public/images/`,
 *   который отдаётся тем же доменом, что и само приложение.
 *
 * Как получить «настоящие» фото в Cloudinary:
 *   1. Зайдите в Cloudinary Console -> Uploads (cloud name: ylksrnxy).
 *   2. Загрузите фото блюд в папку `swypemeal/base`.
 *   3. Пропишите public_id каждого фото в массиве CLOUDINARY_IDS ниже
 *      (или задайте их через переменную окружения VITE_CLOUDINARY_BASE_IDS
 *      в формате JSON).
 *   После этого карточки будут использовать res.cloudinary.com,
 *   а локальные файлы останутся страховкой на случай сбоя загрузки.
 */

export const RECIPE_IMAGE_COUNT = 12;

/** Локальные резервные изображения (лежат в public/images -> доступны по /images/*) */
export const LOCAL_RECIPE_IMAGES: string[] = [
  '/images/carbonara.jpg',
  '/images/tom-yum.jpg',
  '/images/bowl.jpg',
  '/images/risotto.jpg',
  '/images/taco.jpg',
  '/images/salmon.jpg',
  '/images/shawarma.jpg',
  '/images/tiramisu.jpg',
  '/images/tom-kha.jpg',
  '/images/pancakes.jpg',
  '/images/curry.jpg',
  '/images/steak.jpg',
];

/** Cloudinary public_id базовых фото (заполняются после загрузки в Cloudinary) */
const DEFAULT_CLOUDINARY_IDS = [
  'swypemeal/base/carbonara',
  'swypemeal/base/tom-yum',
  'swypemeal/base/bowl',
  'swypemeal/base/risotto',
  'swypemeal/base/taco',
  'swypemeal/base/salmon',
  'swypemeal/base/shawarma',
  'swypemeal/base/tiramisu',
  'swypemeal/base/tom-kha',
  'swypemeal/base/pancakes',
  'swypemeal/base/curry',
  'swypemeal/base/steak',
];

const CLOUDINARY_CLOUD_NAME: string =
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) || '';

function readConfiguredIds(): string[] {
  const raw = import.meta.env.VITE_CLOUDINARY_BASE_IDS as string | undefined;
  if (!raw) return DEFAULT_CLOUDINARY_IDS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === RECIPE_IMAGE_COUNT) {
      return parsed.map((v: unknown) => String(v));
    }
  } catch {
    /* невалидная конфигурация — используем значения по умолчанию */
  }
  return DEFAULT_CLOUDINARY_IDS;
}

const CLOUDINARY_IDS = readConfiguredIds();

/** URL изображения в Cloudinary (или пустая строка, если Cloudinary не настроен) */
export function cloudinaryImageUrl(index: number): string {
  if (!CLOUDINARY_CLOUD_NAME) return '';
  const id = CLOUDINARY_IDS[index % RECIPE_IMAGE_COUNT];
  if (!id) return '';
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/` +
    'fl_keep_dpr,w_800,h_600,c_fill,q_auto,f_jpg/' + id;
}

/** Локальный резервный URL */
export function localImageUrl(index: number): string {
  return LOCAL_RECIPE_IMAGES[index % RECIPE_IMAGE_COUNT];
}

/**
 * Возвращает цепочку URL для изображения: сначала основной, затем резервные.
 * Используется компонентом SafeImage.
 */
export function imageFallbackChain(primary?: string, index?: number): string[] {
  const chain: string[] = [];
  const add = (url?: string) => {
    if (url && !chain.includes(url)) chain.push(url);
  };
  add(primary);
  if (typeof index === 'number') {
    add(cloudinaryImageUrl(index));
    add(localImageUrl(index));
  }
  // Если индекс неизвестен — хотя бы одно статичное изображение-заглушка
  if (chain.length === 0) add(localImageUrl(0));
  return chain;
}

/** Индекс рецепта по его id (базовые рецепты имеют id '1'...'12') */
export function recipeImageIndex(id?: string | number): number | undefined {
  if (id === undefined || id === null) return undefined;
  const n = Number.parseInt(String(id), 10);
  if (Number.isNaN(n) || n < 1) return undefined;
  return (n - 1) % RECIPE_IMAGE_COUNT;
}
