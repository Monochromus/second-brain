import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase, Heart, Home, BookOpen, Users, DollarSign,
  Dumbbell, GraduationCap, Plus, MoreVertical, Archive,
  Pencil, Trash2, FolderOpen
} from 'lucide-react';
import { useAreas } from '../hooks/useAreas';
import { useAgent } from '../hooks/useAgent';
import AreaModal from '../components/areas/AreaModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { cn } from '../lib/utils';

const ICONS = {
  briefcase: Briefcase,
  heart: Heart,
  home: Home,
  book: BookOpen,
  users: Users,
  dollar: DollarSign,
  dumbbell: Dumbbell,
  graduation: GraduationCap,
  folder: FolderOpen
};

export default function AreasPage() {
  const navigate = useNavigate();
  const {
    areas,
    loading,
    refetch,
    createArea,
    updateArea,
    deleteArea,
    archiveArea
  } = useAreas();

  const refreshCallbacks = useMemo(() => ({
    // Refresh wenn Agent Bereiche ändert
  }), []);
  useAgent(refreshCallbacks);

  const [modal, setModal] = useState({ open: false, area: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [menuOpen, setMenuOpen] = useState(null);

  const handleAreaClick = (areaId, e) => {
    // Don't navigate if clicking on menu button
    if (e.target.closest('button')) return;
    navigate(`/area/${areaId}`);
  };

  const handleSave = async (data) => {
    if (modal.area) {
      await updateArea(modal.area.id, data);
    } else {
      await createArea(data);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      await deleteArea(deleteConfirm.id);
    }
  };

  const handleArchive = async (id) => {
    await archiveArea(id);
    setMenuOpen(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Bereiche</h1>
          <p className="text-text-secondary">Deine Verantwortungsbereiche und Lebensbereiche</p>
        </div>
        <button
          onClick={() => setModal({ open: true, area: null })}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Neuer Bereich
        </button>
      </div>

      {areas.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-secondary flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-text-secondary" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Keine Bereiche vorhanden
          </h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Bereiche helfen dir, deine Verantwortlichkeiten zu organisieren.
            Beispiele: Arbeit, Gesundheit, Familie, Finanzen.
          </p>
          <button
            onClick={() => setModal({ open: true, area: null })}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Ersten Bereich erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map(area => {
            const IconComponent = ICONS[area.icon] || FolderOpen;

            return (
              <div
                key={area.id}
                onClick={(e) => handleAreaClick(area.id, e)}
                className="card p-5 hover:shadow-md transition-shadow group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${area.color}20` }}
                  >
                    <IconComponent
                      className="w-6 h-6"
                      style={{ color: area.color }}
                    />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === area.id ? null : area.id)}
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === area.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
                          <button
                            onClick={() => {
                              setModal({ open: true, area });
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                          >
                            <Pencil className="w-4 h-4" />
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleArchive(area.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                          >
                            <Archive className="w-4 h-4" />
                            Archivieren
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm({ open: true, id: area.id });
                              setMenuOpen(null);
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

                <h3 className="font-semibold text-text-primary mb-1">{area.name}</h3>
                {area.description && (
                  <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                    {area.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  {area.project_count > 0 && (
                    <span>{area.project_count} Projekte</span>
                  )}
                  {area.todo_count > 0 && (
                    <span>{area.todo_count} Todos</span>
                  )}
                  {area.note_count > 0 && (
                    <span>{area.note_count} Notizen</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AreaModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, area: null })}
        area={modal.area}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Bereich löschen"
        message="Möchtest du diesen Bereich wirklich löschen? Zugeordnete Elemente werden nicht gelöscht."
        confirmText="Löschen"
      />
    </div>
  );
}
