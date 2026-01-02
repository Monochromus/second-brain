import { useState, useEffect, useCallback } from 'react';
import Modal from '../shared/Modal';
import IconPicker from '../shared/IconPicker';
import { format } from 'date-fns';
import { useAreas } from '../../hooks/useAreas';
import { useAutosave } from '../../hooks/useAutosave';
import { FolderOpen, Folder } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const colorOptions = [
  '#D97706',
  '#DC2626',
  '#059669',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#65A30D'
];

// Convert kebab-case to PascalCase for lucide-react
const toPascalCase = (str) =>
  str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

export default function ProjectModal({ isOpen, onClose, project, onSave, defaultAreaId }) {
  const { areas } = useAreas();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#D97706',
    status: 'active',
    deadline: '',
    area_id: '',
    icon: 'folder'
  });
  const [saving, setSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const isEditing = Boolean(project);

  const handleAutosave = useCallback(async (data) => {
    if (!data.name.trim()) return;
    await onSave({
      ...data,
      deadline: data.deadline || null,
      area_id: data.area_id ? parseInt(data.area_id) : null
    });
  }, [onSave]);

  const { saveImmediately } = useAutosave(handleAutosave, 500);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        color: project.color || '#D97706',
        status: project.status || 'active',
        deadline: project.deadline ? format(new Date(project.deadline), 'yyyy-MM-dd') : '',
        area_id: project.area_id || '',
        icon: project.icon || 'folder'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#D97706',
        status: 'active',
        deadline: '',
        area_id: defaultAreaId || '',
        icon: 'folder'
      });
    }
  }, [project, isOpen, defaultAreaId]);

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
  };

  const handleClose = async () => {
    if (isEditing && formData.name.trim()) {
      await saveImmediately(formData);
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...formData,
        deadline: formData.deadline || null,
        area_id: formData.area_id ? parseInt(formData.area_id) : null
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Get current icon component
  const IconComponent = LucideIcons[toPascalCase(formData.icon)] || Folder;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={project ? 'Projekt bearbeiten' : 'Neues Projekt'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Projektname *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
                            className="input"
              placeholder="Name des Projekts"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
                            className="input min-h-[100px] resize-none"
              placeholder="Worum geht es in diesem Projekt?"
            />
          </div>

          <div>
            <label className="label">Area</label>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <select
                value={formData.area_id}
                onChange={(e) => handleChange('area_id', e.target.value)}
                                className="input pl-10"
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

          {/* Icon and Color row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Icon</label>
              <button
                type="button"
                onClick={() => setShowIconPicker(true)}
                className="w-12 h-12 rounded-lg border-2 border-border hover:border-accent flex items-center justify-center transition-colors"
                style={{ backgroundColor: formData.color + '15' }}
              >
                <IconComponent className="w-6 h-6" style={{ color: formData.color }} />
              </button>
            </div>

            <div>
              <label className="label">Farbe</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleChange('color', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? 'border-text-primary scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                                className="input"
              >
                <option value="active">Aktiv</option>
                <option value="completed">Abgeschlossen</option>
                <option value="archived">Archiviert</option>
              </select>
            </div>

            <div>
              <label className="label">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                                className="input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={handleClose} className="btn btn-secondary">
              {isEditing ? 'Schließen' : 'Abbrechen'}
            </button>
            {!isEditing && (
              <button
                type="submit"
                disabled={!formData.name.trim() || saving}
                className="btn btn-primary"
              >
                {saving ? 'Erstelle...' : 'Erstellen'}
              </button>
            )}
          </div>
        </form>
      </Modal>

      {showIconPicker && (
        <IconPicker
          value={formData.icon}
          onChange={(icon) => handleChange('icon', icon)}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </>
  );
}
