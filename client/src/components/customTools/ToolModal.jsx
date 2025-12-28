import { useState, useEffect } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import Modal from '../shared/Modal';

export default function ToolModal({
  isOpen,
  onClose,
  tool,
  onSave
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [regenerate, setRegenerate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tool) {
      setName(tool.name || '');
      setDescription(tool.description || '');
      setRegenerate(false);
    }
  }, [tool]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        regenerate
      });
      onClose();
    } catch {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = tool && (
    name !== tool.name ||
    description !== tool.description
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-w-lg w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary">
            Tool bearbeiten
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full h-32 resize-none"
              required
            />
          </div>

          {hasChanges && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regenerate}
                  onChange={(e) => setRegenerate(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-sm text-text-primary">
                  Code neu generieren
                </span>
              </label>
              <p className="text-xs text-text-secondary mt-1 ml-6">
                Wenn aktiviert, wird der Code basierend auf der neuen Beschreibung regeneriert.
                Dies kann einige Sekunden dauern.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSaving || (!hasChanges && !regenerate)}
              className="btn btn-primary flex-1"
            >
              {isSaving ? (
                'Speichert...'
              ) : regenerate ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Speichern & Regenerieren
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Speichern
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
