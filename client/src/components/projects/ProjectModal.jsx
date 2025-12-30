import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { format } from 'date-fns';
import { useAreas } from '../../hooks/useAreas';
import { FolderOpen } from 'lucide-react';

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

export default function ProjectModal({ isOpen, onClose, project, onSave, defaultAreaId }) {
  const { areas } = useAreas();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#D97706',
    status: 'active',
    deadline: '',
    area_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        color: project.color || '#D97706',
        status: project.status || 'active',
        deadline: project.deadline ? format(new Date(project.deadline), 'yyyy-MM-dd') : '',
        area_id: project.area_id || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#D97706',
        status: 'active',
        deadline: '',
        area_id: defaultAreaId || ''
      });
    }
  }, [project, isOpen, defaultAreaId]);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? 'Projekt bearbeiten' : 'Neues Projekt'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Projektname *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="Name des Projekts"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Beschreibung</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
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

        <div>
          <label className="label">Farbe</label>
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!formData.name.trim() || saving}
            className="btn btn-primary"
          >
            {saving ? 'Speichere...' : project ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
