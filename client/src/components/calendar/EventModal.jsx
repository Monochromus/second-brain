import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { format } from 'date-fns';

export default function EventModal({ isOpen, onClose, event, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    location: '',
    is_all_day: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_time);
      const endDate = new Date(event.end_time);
      setFormData({
        title: event.title || '',
        description: event.description || '',
        start_date: format(startDate, 'yyyy-MM-dd'),
        start_time: format(startDate, 'HH:mm'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        end_time: format(endDate, 'HH:mm'),
        location: event.location || '',
        is_all_day: event.is_all_day || false
      });
    } else {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      setFormData({
        title: '',
        description: '',
        start_date: format(now, 'yyyy-MM-dd'),
        start_time: format(now, 'HH:mm'),
        end_date: format(now, 'yyyy-MM-dd'),
        end_time: format(oneHourLater, 'HH:mm'),
        location: '',
        is_all_day: false
      });
    }
  }, [event, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      const start_time = formData.is_all_day
        ? `${formData.start_date}T00:00:00`
        : `${formData.start_date}T${formData.start_time}:00`;
      const end_time = formData.is_all_day
        ? `${formData.end_date}T23:59:59`
        : `${formData.end_date}T${formData.end_time}:00`;

      await onSave({
        title: formData.title,
        description: formData.description || null,
        start_time,
        end_time,
        location: formData.location || null,
        is_all_day: formData.is_all_day
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
      title={event ? 'Termin bearbeiten' : 'Neuer Termin'}
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
            placeholder="Terminbezeichnung"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Beschreibung</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input min-h-[80px] resize-none"
            placeholder="Optionale Details..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_all_day"
            checked={formData.is_all_day}
            onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })}
            className="checkbox"
          />
          <label htmlFor="is_all_day" className="text-sm text-text-primary cursor-pointer">
            Ganztägig
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Startdatum *</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="input"
              required
            />
          </div>
          {!formData.is_all_day && (
            <div>
              <label className="label">Startzeit *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="input"
                required
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Enddatum *</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="input"
              required
            />
          </div>
          {!formData.is_all_day && (
            <div>
              <label className="label">Endzeit *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="input"
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className="label">Ort</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="input"
            placeholder="Wo findet der Termin statt?"
          />
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
            {saving ? 'Speichere...' : event ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
