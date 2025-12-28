import { useState } from 'react';
import { Plus, Sparkles, Loader2, Lightbulb, X } from 'lucide-react';
import { EXAMPLE_PROMPTS } from '../../hooks/useCustomTools';

export default function EmptyContainer({ onGenerate, isGenerating, containerIndex }) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || isGenerating) return;

    try {
      await onGenerate(description.trim());
      setDescription('');
      setIsEditing(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleExampleClick = (example) => {
    setDescription(example.description);
    setShowExamples(false);
  };

  const handleCancel = () => {
    setDescription('');
    setIsEditing(false);
    setShowExamples(false);
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="card border-2 border-dashed border-border hover:border-accent/50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[280px] group"
      >
        <div className="w-14 h-14 rounded-2xl bg-surface-secondary group-hover:bg-accent/10 flex items-center justify-center mb-4 transition-colors">
          <Plus className="w-7 h-7 text-text-secondary group-hover:text-accent transition-colors" />
        </div>
        <h3 className="font-semibold text-text-primary mb-1">Widget hinzufügen</h3>
        <p className="text-sm text-text-secondary text-center px-4">
          Beschreibe dein Widget in natürlicher Sprache
        </p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col min-h-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-text-primary">Neues Widget</h3>
        </div>
        <button
          onClick={handleCancel}
          className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="z.B. 'Pomodoro-Timer mit 25 Minuten Arbeitszeit' oder 'Weltuhr für Berlin, New York und Tokyo'"
          className="input flex-1 resize-none mb-3"
          autoFocus
          disabled={isGenerating}
        />

        {/* Examples */}
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="flex items-center gap-1 text-sm text-accent hover:underline mb-3 self-start"
        >
          <Lightbulb className="w-4 h-4" />
          {showExamples ? 'Beispiele ausblenden' : 'Beispiele anzeigen'}
        </button>

        {showExamples && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {EXAMPLE_PROMPTS.slice(0, 4).map((example) => (
              <button
                key={example.title}
                type="button"
                onClick={() => handleExampleClick(example)}
                className="p-2 text-left rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <div className="font-medium text-xs text-text-primary">{example.title}</div>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary flex-1"
            disabled={isGenerating}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!description.trim() || isGenerating}
            className="btn btn-primary flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Erstellen
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
