import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { optimizeImage, formatFileSize } from '../utils/imageOptimizer';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  const uploadImage = async (file: File) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setError('Cloudinary не настроен');
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Допустимые форматы: JPG, PNG, WebP, GIF');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Максимальный размер: 10MB');
      return;
    }

    setError(null);
    setOptimizing(true);

    try {
      const optimizedBlob = await optimizeImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        format: 'webp',
      });

      setOptimizing(false);
      setUploading(true);

      const optimizedFile = new File(
        [optimizedBlob],
        `recipe-${Date.now()}.webp`,
        { type: 'image/webp' }
      );

      const formData = new FormData();
      formData.append('file', optimizedFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'swypemeal/recipes');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) {
        throw new Error('Ошибка загрузки изображения');
      }

      const data = await response.json();
      onChange(data.secure_url);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setOptimizing(false);
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadImage(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isValidImageUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 block">Изображение блюда</label>
      
      {isValidImageUrl(value) ? (
        <div className="relative group">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 object-cover rounded-xl border border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full h-48 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${
            dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-300 bg-gray-50 hover:border-orange-300'
          } ${(uploading || optimizing) ? 'pointer-events-none opacity-60' : ''}`}
        >
          {optimizing ? (
            <>
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">Оптимизация...</span>
            </>
          ) : uploading ? (
            <>
              <Loader2 size={32} className="animate-spin text-orange-500" />
              <span className="text-sm text-gray-600">Загрузка...</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Upload size={20} className="text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Нажмите или перетащите</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP, GIF до 10MB</p>
              </div>
            </>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X size={14} />
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-xs text-gray-400">или вставьте URL</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>
      
      <input
        type="url"
        value={isValidImageUrl(value) && !value.startsWith('blob:') ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com/image.jpg"
        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        disabled={uploading || optimizing}
      />
    </div>
  );
}
