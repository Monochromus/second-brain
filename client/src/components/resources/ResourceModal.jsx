import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Tag, Folder } from 'lucide-react';
import { useAutosave } from '../../hooks/useAutosave';
import { useProjects } from '../../hooks/useProjects';

// PARA: Resources can be linked to multiple Projects (n:m)
export default function ResourceModal({ isOpen, onClose, resource, onSave, categories = [] }) {
  const { projects } = useProjects({ status: 'active' });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    url: '',
    category: '',
    tags: [],
    project_ids: []
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(resource);

  const handleAutosave = useCallback(async (data) => {
    if (!data.title.trim()) return;
    await onSave(data);
  }, [onSave]);

  const { saveImmediately } = useAutosave(handleAutosave, 500);

  useEffect(() => {
    if (resource) {
      setFormData({
        title: resource.title || '',
        content: resource.content || '',
        url: resource.url || '',
        category: resource.category || '',
        tags: resource.tags || [],
        project_ids: resource.projects?.map(p => p.id) || []
      });
    } else {
      setFormData({
        title: '',
        content: '',
        url: '',
        category: '',
        tags: [],
        project_ids: []
      });
    }
    setTagInput('');
  }, [resource, isOpen]);

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
  };

  // Toggle project selection (multi-select)
  const toggleProject = (projectId) => {
    setFormData(prev => ({
      ...prev,
      project_ids: prev.project_ids.includes(projectId)
        ? prev.project_ids.filter(id => id !== projectId)
        : [...prev.project_ids, projectId]
    }));
  };

  const handleClose = async () => {
    if (isEditing && formData.title.trim()) {
      await saveImmediately(formData);
    }
    onClose();
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-lg bg-surface rounded-xl shadow-xl border border-border animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="text-lg font-semibold text-text-primary">
            {resource ? 'Ressource bearbeiten' : 'Neue Ressource'}
          </h2>
          <button
            onClick={handleClose}
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
              onChange={(e) => handleChange('title', e.target.value)}
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
              onChange={(e) => handleChange('content', e.target.value)}
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
              onChange={(e) => handleChange('url', e.target.value)}
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
              onChange={(e) => handleChange('category', e.target.value)}
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

          {/* PARA: Resources can be linked to multiple Projects */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Verknüpfte Projekte
            </label>
            <div className="flex flex-wrap gap-2">
              {projects.map(project => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => toggleProject(project.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    formData.project_ids.includes(project.id)
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-accent/50 text-text-secondary'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  {project.name}
                </button>
              ))}
              {projects.length === 0 && (
                <span className="text-sm text-text-secondary">Keine aktiven Projekte</span>
              )}
            </div>
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

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
            >
              {isEditing ? 'Schließen' : 'Abbrechen'}
            </button>
            {!isEditing && (
              <button
                type="submit"
                disabled={saving || !formData.title.trim()}
                className="btn btn-primary"
              >
                {saving ? 'Erstelle...' : 'Erstellen'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
