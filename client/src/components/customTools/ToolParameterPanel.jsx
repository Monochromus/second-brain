import { Play, Save } from 'lucide-react';

export default function ToolParameterPanel({
  schema,
  values,
  onChange,
  onSave,
  onExecute
}) {
  const renderInput = (key, defaultValue) => {
    const value = values[key] ?? defaultValue;
    const type = typeof defaultValue;

    if (type === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(key, e.target.checked)}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm text-text-primary">{key}</span>
        </label>
      );
    }

    if (type === 'number') {
      return (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {key}
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
            className="input w-full"
          />
        </div>
      );
    }

    if (Array.isArray(defaultValue)) {
      return (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {key}
          </label>
          <textarea
            value={Array.isArray(value) ? value.join('\n') : String(value)}
            onChange={(e) => onChange(key, e.target.value.split('\n').filter(Boolean))}
            placeholder="Ein Wert pro Zeile"
            className="input w-full h-24 resize-none"
          />
        </div>
      );
    }

    // Default: string input
    return (
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {key}
        </label>
        <input
          type="text"
          value={String(value)}
          onChange={(e) => onChange(key, e.target.value)}
          className="input w-full"
        />
      </div>
    );
  };

  const entries = Object.entries(schema || {});

  if (entries.length === 0) {
    return (
      <div className="w-64 p-4 bg-surface-secondary">
        <p className="text-sm text-text-secondary text-center">
          Keine Parameter verfügbar
        </p>
      </div>
    );
  }

  return (
    <div className="w-72 p-4 bg-surface-secondary overflow-y-auto">
      <h3 className="font-semibold text-text-primary mb-4">Parameter</h3>

      <div className="space-y-4">
        {entries.map(([key, defaultValue]) => (
          <div key={key}>
            {renderInput(key, defaultValue)}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-6 pt-4 border-t border-border">
        <button
          onClick={onSave}
          className="btn btn-secondary flex-1"
        >
          <Save className="w-4 h-4" />
          Speichern
        </button>
        <button
          onClick={onExecute}
          className="btn btn-primary flex-1"
        >
          <Play className="w-4 h-4" />
          Ausführen
        </button>
      </div>
    </div>
  );
}
