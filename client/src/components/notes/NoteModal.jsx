import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import NoteEditor from './NoteEditor';
import { useProjects } from '../../hooks/useProjects';
import { useAreas } from '../../hooks/useAreas';
import { X, Plus } from 'lucide-react';

const colorOptions = [
  { value: '', label: 'Standard' },
  { value: '#FEF3C7', label: 'Gelb' },
  { value: '#DBEAFE', label: 'Blau' },
  { value: '#D1FAE5', label: 'Grün' },
  { value: '#FCE7F3', label: 'Rosa' },
  { value: '#E9D5FF', label: 'Lila' },
  { value: '#FED7AA', label: 'Orange' }
];

export default function NoteModal({ isOpen, onClose, note, onSave }) {
  const { projects } = useProjects({ status: 'active' });
  const { areas } = useAreas();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [],
    color: '',
    project_id: '',
    area_id: '',
    is_pinned: false
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title || '',
        content: note.content || '',
        tags: note.tags || [],
        color: note.color || '',
        project_id: note.project_id || '',
        area_id: note.area_id || '',
        is_pinned: note.is_pinned || false
      });
    } else {
      setFormData({
        title: '',
        content: '',
        tags: [],
        color: '',
        project_id: '',
        area_id: '',
        is_pinned: false
      });
    }
    setTagInput('');
  }, [note, isOpen]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag]
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove)
    });
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...formData,
        project_id: formData.project_id || null,
        area_id: formData.area_id || null,
        color: formData.color || null
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={note ? 'Notiz bearbeiten' : 'Neue Notiz'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Titel *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input"
            placeholder="Titel der Notiz"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Inhalt</label>
          <NoteEditor
            content={formData.content}
            onChange={(content) => setFormData({ ...formData, content })}
            placeholder="Schreibe deine Notiz..."
          />
        </div>

        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-surface-secondary text-text-secondary text-sm rounded-full"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-error"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              className="input flex-1"
              placeholder="Tag hinzufügen..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn btn-secondary"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Projekt</label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="input"
            >
              <option value="">Kein Projekt</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Area</label>
            <select
              value={formData.area_id}
              onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
              className="input"
            >
              <option value="">Keine Area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Farbe</label>
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value || 'default'}
                type="button"
                onClick={() => setFormData({ ...formData, color: color.value })}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color.value
                    ? 'border-accent scale-110'
                    : 'border-transparent'
                }`}
                style={{
                  backgroundColor: color.value || 'var(--surface-secondary)'
                }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_pinned"
            checked={formData.is_pinned}
            onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
            className="checkbox"
          />
          <label htmlFor="is_pinned" className="text-sm text-text-primary cursor-pointer">
            Notiz anheften
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!formData.title.trim() || saving}
            className="btn btn-primary"
          >
            {saving ? 'Speichere...' : note ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
