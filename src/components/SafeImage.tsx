import { useEffect, useMemo, useState } from 'react';
import { imageFallbackChain, recipeImageIndex } from '../utils/recipeImages';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  /** Основной URL изображения (может быть недоступен — сработает fallback) */
  src?: string;
  /** id рецепта — используется для подбора резервного изображения */
  recipeId?: string | number;
  /** Явный индекс резервного изображения (если известен) */
  fallbackIndex?: number;
}

/**
 * <img> с автоматическим резервным изображением.
 *
 * Если основной URL не загрузился (например ERR_CONNECTION_RESET от
 * images.unsplash.com / upload.wikimedia.org в России), компонент
 * последовательно пробует Cloudinary-версию, а затем локальный файл
 * из public/images. Таким образом карточка никогда не остаётся «битой».
 */
export default function SafeImage({
  src,
  recipeId,
  fallbackIndex,
  alt = '',
  className,
  ...rest
}: SafeImageProps) {
  const chain = useMemo(() => {
    const index = typeof fallbackIndex === 'number' ? fallbackIndex : recipeImageIndex(recipeId);
    return imageFallbackChain(src, index);
  }, [src, recipeId, fallbackIndex]);

  const [pointer, setPointer] = useState(0);

  // При смене набора URL начинаем с первого
  useEffect(() => {
    setPointer(0);
  }, [chain]);

  const current = chain[pointer] ?? chain[chain.length - 1];

  const handleError = () => {
    setPointer((p) => (p < chain.length - 1 ? p + 1 : p));
  };

  if (!current) return null;

  return (
    <img
      {...rest}
      src={current}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
      decoding="async"
    />
  );
}
