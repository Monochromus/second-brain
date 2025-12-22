import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { useProjects } from '../../hooks/useProjects';
import { format } from 'date-fns';

export default function TodoModal({ isOpen, onClose, todo, onSave }) {
  const { projects } = useProjects({ status: 'active' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 3,
    status: 'open',
    due_date: '',
    due_time: '',
    project_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title || '',
        description: todo.description || '',
        priority: todo.priority || 3,
        status: todo.status || 'open',
        due_date: todo.due_date ? format(new Date(todo.due_date), 'yyyy-MM-dd') : '',
        due_time: todo.due_time || '',
        project_id: todo.project_id || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 3,
        status: 'open',
        due_date: '',
        due_time: '',
        project_id: ''
      });
    }
  }, [todo, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...formData,
        project_id: formData.project_id || null,
        due_date: formData.due_date || null,
        due_time: formData.due_time || null
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
      title={todo ? 'Todo bearbeiten' : 'Neues Todo'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Titel *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input"
            placeholder="Was muss erledigt werden?"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Beschreibung</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input min-h-[100px] resize-none"
            placeholder="Optionale Details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Priorität</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="input"
            >
              <option value={1}>Sehr hoch</option>
              <option value={2}>Hoch</option>
              <option value={3}>Mittel</option>
              <option value={4}>Niedrig</option>
              <option value={5}>Sehr niedrig</option>
            </select>
          </div>

          <div>
            <label className="label">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input"
            >
              <option value="open">Offen</option>
              <option value="in_progress">In Bearbeitung</option>
              <option value="done">Erledigt</option>
              <option value="cancelled">Abgebrochen</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Fällig am</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Uhrzeit</label>
            <input
              type="time"
              value={formData.due_time}
              onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
              className="input"
            />
          </div>
        </div>

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

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!formData.title.trim() || saving}
            className="btn btn-primary"
          >
            {saving ? 'Speichere...' : todo ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
