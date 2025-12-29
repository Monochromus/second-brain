import { useState } from 'react';
import {
  Archive, ChevronUp, ChevronDown, RotateCcw, Trash2,
  Folder, CheckCircle, FileText, FolderOpen, Library
} from 'lucide-react';
import { useArchive } from '../../hooks/useArchive';
import ConfirmDialog from '../shared/ConfirmDialog';
import { cn, formatTimeAgo } from '../../lib/utils';

const TYPE_CONFIG = {
  project: { icon: Folder, label: 'Projekt', plural: 'Projekte' },
  todo: { icon: CheckCircle, label: 'Todo', plural: 'Todos' },
  note: { icon: FileText, label: 'Notiz', plural: 'Notizen' },
  area: { icon: FolderOpen, label: 'Bereich', plural: 'Bereiche' },
  resource: { icon: Library, label: 'Ressource', plural: 'Ressourcen' }
};

export default function ArchiveDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, id: null });
  const { archive, loading, restoreItem, deleteItem } = useArchive();

  const handleRestore = async (type, id) => {
    await restoreItem(type, id);
  };

  const handleDelete = async () => {
    const { type, id } = deleteConfirm;
    if (type && id) {
      await deleteItem(type, id);
    }
  };

  const allItems = [
    ...archive.projects.map(p => ({ ...p, itemType: 'project' })),
    ...archive.areas.map(a => ({ ...a, itemType: 'area' })),
    ...archive.todos.map(t => ({ ...t, itemType: 'todo' })),
    ...archive.notes.map(n => ({ ...n, itemType: 'note' })),
    ...archive.resources.map(r => ({ ...r, itemType: 'resource' }))
  ].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  if (archive.total === 0 && !loading) {
    return null;
  }

  return (
    <>
      {/* Archive Toggle Button */}
      <div className="fixed bottom-4 right-4 z-40 md:bottom-4 bottom-20">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full transition-all',
            'glass hover:shadow-xl',
            isOpen && 'bg-accent text-white border-accent'
          )}
        >
          <Archive className="w-4 h-4" />
          <span className="text-sm font-medium">
            Archiv ({archive.total})
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Archive Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed md:bottom-16 bottom-24 right-4 w-96 max-w-[calc(100vw-2rem)] max-h-[60vh] glass-strong z-40 overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Archiv
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {archive.total} archivierte Elemente
              </p>
            </div>

            <div className="overflow-y-auto max-h-[calc(60vh-80px)]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 skeleton rounded-lg" />
                  ))}
                </div>
              ) : allItems.length === 0 ? (
                <div className="p-8 text-center">
                  <Archive className="w-12 h-12 mx-auto text-text-secondary mb-3" />
                  <p className="text-sm text-text-secondary">
                    Keine archivierten Elemente
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {allItems.map(item => {
                    const config = TYPE_CONFIG[item.itemType];
                    const Icon = config.icon;

                    return (
                      <div
                        key={`${item.itemType}-${item.id}`}
                        className="p-3 hover:bg-surface-secondary transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: item.color ? `${item.color}20` : 'var(--surface-secondary)'
                            }}
                          >
                            <Icon
                              className="w-4 h-4"
                              style={{ color: item.color || 'var(--text-secondary)' }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {config.label} • {formatTimeAgo(item.updated_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRestore(item.itemType, item.id)}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-success hover:bg-success/10 transition-colors"
                              title="Wiederherstellen"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({
                                open: true,
                                type: item.itemType,
                                id: item.id
                              })}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                              title="Endgültig löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, type: null, id: null })}
        onConfirm={handleDelete}
        title="Endgültig löschen"
        message="Möchtest du dieses Element wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmText="Endgültig löschen"
      />
    </>
  );
}
