import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Heart, Home, BookOpen, Users, DollarSign,
  Dumbbell, GraduationCap, Plus, MoreVertical, Archive,
  Pencil, Trash2, FolderOpen, Gamepad2, Sparkles, Target,
  Music, Plane, ShoppingBag, Wrench, Lightbulb
} from 'lucide-react';
import { useAreas } from '../hooks/useAreas';
import { useAgent } from '../hooks/useAgent';
import AreaModal from '../components/areas/AreaModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const API_BASE = import.meta.env.VITE_API_URL || '';

const ICONS = {
  briefcase: Briefcase,
  heart: Heart,
  home: Home,
  book: BookOpen,
  users: Users,
  dollar: DollarSign,
  dumbbell: Dumbbell,
  graduation: GraduationCap,
  gamepad: Gamepad2,
  sparkles: Sparkles,
  target: Target,
  music: Music,
  plane: Plane,
  shopping: ShoppingBag,
  wrench: Wrench,
  lightbulb: Lightbulb,
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

  const refreshCallbacks = useMemo(() => ({}), []);
  useAgent(refreshCallbacks);

  const [modal, setModal] = useState({ open: false, area: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [menuOpen, setMenuOpen] = useState(null);

  const handleAreaClick = (areaId, e) => {
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
          <h1 className="heading-1 mb-1">Areas</h1>
          <p className="text-text-secondary">Deine Verantwortungsbereiche nach dem PARA-Prinzip</p>
        </div>
        <button
          onClick={() => setModal({ open: true, area: null })}
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors"
          title="Neue Area"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="notebook-divider mb-6" />

      {areas.length === 0 ? (
        <div className="notebook-section text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-secondary flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-text-secondary" />
          </div>
          <h2 className="heading-3 mb-2">
            Keine Areas vorhanden
          </h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Areas sind dauerhafte Verantwortungsbereiche nach dem PARA-Prinzip.
            Beispiele: Arbeit, Gesundheit, Familie, Finanzen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {areas.map(area => {
            const IconComponent = ICONS[area.icon] || FolderOpen;

            return (
              <div
                key={area.id}
                onClick={(e) => handleAreaClick(area.id, e)}
                className="notebook-card group cursor-pointer overflow-hidden p-0"
              >
                {/* Cover Image or Color Header */}
                {area.cover_image ? (
                  <div className="h-24 w-full">
                    <img
                      src={`${API_BASE}${area.cover_image}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="h-16 w-full"
                    style={{ backgroundColor: `${area.color}20` }}
                  />
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center -mt-8 border-4 border-surface-secondary bg-surface"
                      style={{ boxShadow: 'var(--shadow-card)' }}
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
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary font-sans"
                            >
                              <Pencil className="w-4 h-4" />
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => handleArchive(area.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary font-sans"
                            >
                              <Archive className="w-4 h-4" />
                              Archivieren
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirm({ open: true, id: area.id });
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

                  <h3 className="font-semibold text-text-primary mb-1">{area.name}</h3>
                  {area.description && (
                    <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                      {area.description}
                    </p>
                  )}

                  <div className="notebook-divider !my-3" />

                  <div className="flex items-center gap-3 text-xs text-text-secondary font-sans">
                    {area.project_count > 0 && (
                      <span>{area.project_count} Projekte</span>
                    )}
                    {area.todo_count > 0 && (
                      <span>{area.todo_count} Todos</span>
                    )}
                    {area.note_count > 0 && (
                      <span>{area.note_count} Notizen</span>
                    )}
                    {!area.project_count && !area.todo_count && !area.note_count && (
                      <span className="font-handwriting text-sm">Leer</span>
                    )}
                  </div>
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
        title="Area löschen"
        message="Möchtest du diese Area wirklich löschen? Zugeordnete Elemente werden nicht gelöscht."
        confirmText="Löschen"
      />
    </div>
  );
}
