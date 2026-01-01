import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function CoverImageUploader({ areaId, currentImage, onUpload, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur JPG, PNG, WebP oder GIF erlaubt');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bild darf max. 10MB groß sein');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('cover', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/areas/${areaId}/cover`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload fehlgeschlagen');

      const area = await res.json();
      onUpload(area.cover_image);
      toast.success('Cover-Bild hochgeladen');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/areas/${areaId}/cover`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onRemove();
      toast.success('Cover-Bild entfernt');
    } catch (err) {
      toast.error('Fehler beim Entfernen');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="label">Cover-Bild</label>

      {currentImage ? (
        <div className="relative group">
          <img
            src={`${API_BASE}${currentImage}`}
            alt="Cover"
            className="w-full h-32 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-error text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
          }`}
        >
          {uploading ? (
            <div className="animate-pulse">
              <Upload className="w-8 h-8 mx-auto text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary font-sans">Wird hochgeladen...</p>
            </div>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 mx-auto text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary font-sans">
                Bild hierher ziehen oder klicken
              </p>
              <p className="text-xs text-text-secondary/70 mt-1 font-sans">
                JPG, PNG, WebP oder GIF (max. 10MB)
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files[0])}
        className="hidden"
      />
    </div>
  );
}
