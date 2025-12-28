import { Wrench, Plus } from 'lucide-react';

export default function CustomToolsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Custom Tools</h1>
        <p className="text-text-secondary">Erstelle und verwalte deine eigenen Tools und Automatisierungen</p>
      </div>

      <div className="card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-secondary flex items-center justify-center">
          <Wrench className="w-8 h-8 text-text-secondary" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Noch keine Custom Tools
        </h2>
        <p className="text-text-secondary mb-6 max-w-md mx-auto">
          Hier kannst du bald eigene Tools erstellen, die mit deinem Pocket Assistent zusammenarbeiten.
        </p>
        <button className="btn btn-primary" disabled>
          <Plus className="w-4 h-4" />
          Tool erstellen (bald verfügbar)
        </button>
      </div>
    </div>
  );
}
