import { useState, useEffect } from 'react';
import { X, Plus, Tag } from 'lucide-react';

export default function ResourceModal({ isOpen, onClose, resource, onSave, categories = [] }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    url: '',
    category: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (resource) {
      setFormData({
        title: resource.title || '',
        content: resource.content || '',
        url: resource.url || '',
        category: resource.category || '',
        tags: resource.tags || []
      });
    } else {
      setFormData({
        title: '',
        content: '',
        url: '',
        category: '',
        tags: []
      });
    }
    setTagInput('');
  }, [resource, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface rounded-xl shadow-xl border border-border animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="text-lg font-semibold text-text-primary">
            {resource ? 'Ressource bearbeiten' : 'Neue Ressource'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Titel *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="input"
              placeholder="z.B. Rezept für Pasta, Git Cheatsheet"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Inhalt
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="input min-h-[120px] resize-none"
              placeholder="Notizen, Anleitungen, Informationen..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Link (optional)
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              className="input"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Kategorie
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="input"
              placeholder="z.B. Rezepte, Programmierung, Reisen"
              list="categories"
            />
            <datalist id="categories">
              {categories.map(cat => (
                <option key={cat.category} value={cat.category} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="input flex-1"
                placeholder="Tag eingeben und Enter drücken"
              />
              <button
                type="button"
                onClick={addTag}
                className="btn btn-secondary px-3"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-surface-secondary text-text-primary"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-error"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title.trim()}
              className="btn btn-primary flex-1"
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
