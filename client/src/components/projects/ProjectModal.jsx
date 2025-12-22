import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { format } from 'date-fns';

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

export default function ProjectModal({ isOpen, onClose, project, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#D97706',
    status: 'active',
    deadline: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        color: project.color || '#D97706',
        status: project.status || 'active',
        deadline: project.deadline ? format(new Date(project.deadline), 'yyyy-MM-dd') : ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#D97706',
        status: 'active',
        deadline: ''
      });
    }
  }, [project, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...formData,
        deadline: formData.deadline || null
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
