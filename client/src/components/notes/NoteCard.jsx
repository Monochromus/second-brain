import { Pin, MoreHorizontal, Trash2, Edit, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { cn, stripHtml, truncate, formatTimeAgo } from '../../lib/utils';

export default function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const [showMenu, setShowMenu] = useState(false);

  const contentPreview = truncate(stripHtml(note.content), 150);

  return (
    <div
      className={cn(
        'group notebook-card p-4 hover:shadow-md transition-all duration-200 cursor-pointer',
        'hover:border-accent/30'
      )}
      style={note.color ? { borderLeftColor: note.color, borderLeftWidth: '3px' } : undefined}
      onClick={() => onEdit(note)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-text-primary line-clamp-1 flex-1">
          {note.title}
        </h3>
        <div className="flex items-center gap-1">
          {note.is_pinned && (
            <Pin className="w-4 h-4 text-accent fill-current" />
          )}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-text-secondary opacity-0 group-hover:opacity-100 hover:text-text-primary transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
                  <button
                    onClick={() => {
                      onTogglePin(note.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                  >
                    <Pin className="w-4 h-4" />
                    {note.is_pinned ? 'Lösen' : 'Anheften'}
                  </button>
                  <button
                    onClick={() => {
                      onEdit(note);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                  >
                    <Edit className="w-4 h-4" />
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      onDelete(note.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-surface-secondary"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {contentPreview && (
        <p className="text-xs text-text-secondary line-clamp-3 mb-3">
          {contentPreview}
        </p>
      )}

      {/* Project/Area badge */}
      {(note.project_name || note.area_name) && (
        <div className="flex items-center gap-1.5 mb-2">
          {note.project_name && (
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: note.project_color ? `${note.project_color}20` : 'var(--surface-secondary)',
                color: note.project_color || 'var(--text-secondary)'
              }}
            >
              <Folder className="w-3 h-3" />
              {note.project_name}
            </span>
          )}
          {note.area_name && (
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: note.area_color ? `${note.area_color}20` : 'var(--surface-secondary)',
                color: note.area_color || 'var(--text-secondary)'
              }}
            >
              <FolderOpen className="w-3 h-3" />
              {note.area_name}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex flex-wrap gap-1">
          {note.tags?.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 bg-surface-secondary text-text-secondary rounded-full font-handwriting"
            >
              #{tag}
            </span>
          ))}
          {note.tags?.length > 3 && (
            <span className="text-xs text-text-secondary font-sans">+{note.tags.length - 3}</span>
          )}
        </div>
        <span className="text-xs text-text-secondary font-handwriting">
          {formatTimeAgo(note.updated_at)}
        </span>
      </div>
    </div>
  );
}
