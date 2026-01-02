import { FileText, Plus } from 'lucide-react';
import NoteCard from '../notes/NoteCard';

export default function NotesGrid({ notes, loading, onEdit, onDelete, onTogglePin, onAdd }) {
  if (loading) {
    return (
      <div className="notebook-section p-4">
        <div className="h-6 w-24 skeleton rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 skeleton rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="notebook-section">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h2 className="heading-3">Notizen</h2>
            <span className="text-sm text-text-secondary font-sans">({notes.length})</span>
          </div>
          <button
            onClick={onAdd}
            className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors"
            title="Neue Notiz"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="notebook-divider mx-4" />

      <div className="p-4">
        {notes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {notes.slice(0, 8).map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
              />
            ))}
            {notes.length > 8 && (
              <div
                onClick={onAdd}
                className="notebook-card p-4 flex items-center justify-center cursor-pointer border-dashed hover:border-accent hover:bg-surface-secondary transition-all"
              >
                <div className="text-center">
                  <Plus className="w-8 h-8 mx-auto text-text-secondary mb-2" />
                  <p className="text-sm text-text-secondary font-sans">
                    +{notes.length - 8} weitere
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-text-secondary opacity-50 mb-4" />
            <p className="text-sm text-text-secondary">Noch keine Notizen</p>
          </div>
        )}
      </div>
    </div>
  );
}
