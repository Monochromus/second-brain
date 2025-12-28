import { useState } from 'react';
import { Sparkles, Loader2, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { EXAMPLE_PROMPTS } from '../../hooks/useCustomTools';

export default function ToolDesigner({ onGenerate, isGenerating, limits }) {
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const canCreate = limits.currentCount < limits.maxTools;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || isGenerating || !canCreate) return;

    try {
      await onGenerate(description.trim(), name.trim() || undefined);
      setDescription('');
      setName('');
    } catch {
      // Error handled in hook
    }
  };

  const handleExampleClick = (example) => {
    setDescription(example.description);
    setName(example.title);
    setShowExamples(false);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-accent/10">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Neues Tool erstellen
          </h2>
          <p className="text-sm text-text-secondary">
            Beschreibe dein Tool in natürlicher Sprache
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="z.B. 'Erstelle einen Pomodoro-Timer mit 25 Minuten Arbeitszeit und 5 Minuten Pause' oder 'Zeige eine Weltuhr mit der Zeit in Berlin, New York und Tokyo'"
            className="input w-full h-32 resize-none"
            disabled={isGenerating || !canCreate}
          />
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center gap-1 text-sm text-accent hover:underline"
            >
              <Lightbulb className="w-4 h-4" />
              {showExamples ? 'Beispiele ausblenden' : 'Beispiele anzeigen'}
            </button>
            <span className="text-xs text-text-secondary">
              {limits.currentCount} / {limits.maxTools} Tools
            </span>
          </div>
        </div>

        {showExamples && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example.title}
                type="button"
                onClick={() => handleExampleClick(example)}
                className="p-3 text-left rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <div className="font-medium text-sm text-text-primary">
                  {example.title}
                </div>
                <div className="text-xs text-text-secondary line-clamp-2 mt-1">
                  {example.description}
                </div>
              </button>
            ))}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Erweiterte Optionen
          </button>

          {showAdvanced && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Tool-Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name wird automatisch generiert, wenn leer"
                className="input w-full"
                disabled={isGenerating || !canCreate}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!description.trim() || isGenerating || !canCreate}
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
                Tool generieren
              </>
            )}
          </button>
        </div>

        {!canCreate && (
          <p className="text-sm text-warning text-center">
            Du hast das Maximum von {limits.maxTools} Tools erreicht.
            Lösche ein Tool, um ein neues zu erstellen.
          </p>
        )}
      </form>
    </div>
  );
}
