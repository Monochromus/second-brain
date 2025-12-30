import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function ImageUpload({ images, onImagesChange, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Ungültiges Format. Erlaubt: JPG, PNG, GIF, WebP';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Datei zu groß. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }
    return null;
  };

  const addFiles = useCallback((files) => {
    setError(null);

    const fileArray = Array.from(files);
    const remainingSlots = MAX_FILES - images.length;

    if (fileArray.length > remainingSlots) {
      setError(`Maximal ${MAX_FILES} Bilder erlaubt.`);
      return;
    }

    const validFiles = [];
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
        name: file.name
      });
    }

    onImagesChange([...images, ...validFiles]);
  }, [images, onImagesChange]);

  const removeImage = (index) => {
    const newImages = [...images];
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    onImagesChange(newImages);
    setError(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer',
          'transition-all duration-200',
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-white/30 dark:border-white/10 hover:border-accent/50 hover:bg-white/30 dark:hover:bg-white/5',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'p-3 rounded-full',
            isDragging ? 'bg-accent/20' : 'bg-white/30 dark:bg-white/10'
          )}>
            <Upload className={cn(
              'w-5 h-5',
              isDragging ? 'text-accent' : 'text-text-secondary'
            )} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {isDragging ? 'Bilder hier ablegen' : 'Bilder hochladen'}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Drag & Drop oder klicken • Max {MAX_FILES} Bilder, je {MAX_FILE_SIZE / (1024 * 1024)}MB
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/30 dark:bg-white/10 border border-white/20 dark:border-white/10">
                <img
                  src={image.preview}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className={cn(
                  'absolute -top-1.5 -right-1.5 p-1 rounded-full',
                  'bg-red-500 text-white',
                  'opacity-0 group-hover:opacity-100',
                  'transition-opacity duration-200',
                  'hover:bg-red-600'
                )}
                title="Entfernen"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Placeholder für weitere Bilder */}
          {images.length < MAX_FILES && (
            <button
              onClick={handleClick}
              disabled={disabled}
              className={cn(
                'w-16 h-16 rounded-lg',
                'border-2 border-dashed border-white/30 dark:border-white/10',
                'flex items-center justify-center',
                'text-text-secondary hover:text-accent hover:border-accent/50',
                'transition-all duration-200',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title="Weiteres Bild hinzufügen"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
