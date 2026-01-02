import { useState, useEffect, useCallback } from 'react';
import Modal from '../shared/Modal';
import { useProjects } from '../../hooks/useProjects';
import { useAutosave } from '../../hooks/useAutosave';
import { format } from 'date-fns';

export default function TodoModal({ isOpen, onClose, todo, onSave, defaultProjectId }) {
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
  const isEditing = Boolean(todo);

  const handleAutosave = useCallback(async (data) => {
    if (!data.title.trim()) return;
    await onSave({
      ...data,
      project_id: data.project_id || null,
      due_date: data.due_date || null,
      due_time: data.due_time || null
    });
  }, [onSave]);

  const { saveImmediately } = useAutosave(handleAutosave, 500);

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
        project_id: defaultProjectId || ''
      });
    }
  }, [todo, isOpen, defaultProjectId]);

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
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
      onClose={handleClose}
      title={todo ? 'Todo bearbeiten' : 'Neues Todo'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Titel *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
                        className="input"
            placeholder="Was muss erledigt werden?"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Beschreibung</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
                        className="input min-h-[100px] resize-none"
            placeholder="Optionale Details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Priorität</label>
            <select
              value={formData.priority}
              onChange={(e) => handleChange('priority', parseInt(e.target.value))}
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
              onChange={(e) => handleChange('status', e.target.value)}
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
              onChange={(e) => handleChange('due_date', e.target.value)}
                            className="input"
            />
          </div>

          <div>
            <label className="label">Uhrzeit</label>
            <input
              type="time"
              value={formData.due_time}
              onChange={(e) => handleChange('due_time', e.target.value)}
                            className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Projekt</label>
          <select
            value={formData.project_id}
            onChange={(e) => handleChange('project_id', e.target.value)}
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
          <button type="button" onClick={handleClose} className="btn btn-secondary">
            {isEditing ? 'Schließen' : 'Abbrechen'}
          </button>
          {!isEditing && (
            <button
              type="submit"
              disabled={!formData.title.trim() || saving}
              className="btn btn-primary"
            >
              {saving ? 'Erstelle...' : 'Erstellen'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
