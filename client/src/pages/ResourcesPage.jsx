import { useState, useMemo } from 'react';
import {
  Library, Plus, MoreVertical, Archive, Pencil, Trash2,
  ExternalLink, Tag, Search
} from 'lucide-react';
import { useResources } from '../hooks/useResources';
import { useAgent } from '../hooks/useAgent';
import ResourceModal from '../components/resources/ResourceModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { formatTimeAgo } from '../lib/utils';

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const {
    resources,
    categories,
    loading,
    refetch,
    createResource,
    updateResource,
    deleteResource,
    archiveResource
  } = useResources({
    category: selectedCategory || undefined,
    search: searchQuery || undefined
  });

  const refreshCallbacks = useMemo(() => ({}), []);
  useAgent(refreshCallbacks);

  const [modal, setModal] = useState({ open: false, resource: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [menuOpen, setMenuOpen] = useState(null);

  const handleSave = async (data) => {
    if (modal.resource) {
      await updateResource(modal.resource.id, data);
    } else {
      await createResource(data);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      await deleteResource(deleteConfirm.id);
    }
  };

  const handleArchive = async (id) => {
    await archiveResource(id);
    setMenuOpen(null);
  };

  if (loading && resources.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-1 mb-1">Ressourcen</h1>
          <p className="text-text-secondary">Dein Wissensspeicher</p>
        </div>
        <button
          onClick={() => setModal({ open: true, resource: null })}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Neue Ressource
        </button>
      </div>

      <div className="notebook-divider mb-6" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 font-sans">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ressourcen durchsuchen..."
            className="input pl-10"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input w-auto"
          >
            <option value="">Alle Kategorien</option>
            {categories.map(cat => (
              <option key={cat.category} value={cat.category}>
                {cat.category} ({cat.count})
              </option>
            ))}
          </select>
        )}
      </div>

      {resources.length === 0 ? (
        <div className="notebook-section text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-secondary flex items-center justify-center">
            <Library className="w-8 h-8 text-text-secondary" />
          </div>
          <h2 className="heading-3 mb-2">
            {searchQuery || selectedCategory ? 'Keine Ergebnisse' : 'Keine Ressourcen vorhanden'}
          </h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            {searchQuery || selectedCategory
              ? 'Versuche andere Suchbegriffe oder Filter.'
              : 'Speichere hier Wissen, Links, Anleitungen und alles, was du später brauchen könntest.'
            }
          </p>
          {!searchQuery && !selectedCategory && (
            <button
              onClick={() => setModal({ open: true, resource: null })}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Erste Ressource erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map(resource => (
            <div
              key={resource.id}
              className="notebook-card p-4 group cursor-pointer"
              onClick={() => setModal({ open: true, resource })}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary truncate hover:text-accent transition-colors">
                    {resource.title}
                  </h3>
                  {resource.category && (
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent mt-1 font-sans">
                      {resource.category}
                    </span>
                  )}
                </div>
                <div className="relative ml-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setMenuOpen(menuOpen === resource.id ? null : resource.id)}
                    className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen === resource.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
                        <button
                          onClick={() => {
                            setModal({ open: true, resource });
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary font-sans"
                        >
                          <Pencil className="w-4 h-4" />
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleArchive(resource.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary font-sans"
                        >
                          <Archive className="w-4 h-4" />
                          Archivieren
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirm({ open: true, id: resource.id });
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-surface-secondary font-sans"
                        >
                          <Trash2 className="w-4 h-4" />
                          Löschen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {resource.content && (
                <p className="text-sm text-text-secondary line-clamp-3 mb-3">
                  {resource.content}
                </p>
              )}

              {resource.url && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline mb-3 font-sans"
                >
                  <ExternalLink className="w-3 h-3" />
                  Link öffnen
                </a>
              )}

              {resource.tags && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {resource.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface text-text-secondary font-handwriting"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                  {resource.tags.length > 3 && (
                    <span className="text-xs text-text-secondary font-sans">
                      +{resource.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="notebook-divider !my-3" />

              <p className="text-xs text-text-secondary font-handwriting">
                {formatTimeAgo(resource.updated_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      <ResourceModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, resource: null })}
        resource={modal.resource}
        onSave={handleSave}
        categories={categories}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Ressource löschen"
        message="Möchtest du diese Ressource wirklich löschen?"
        confirmText="Löschen"
      />
    </div>
  );
}
