import { useState, useMemo } from 'react';
import { LayoutGrid, Plus, Search, Filter } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useAgent } from '../hooks/useAgent';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectModal from '../components/projects/ProjectModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const statusTabs = [
  { id: 'active', label: 'Aktiv' },
  { id: 'completed', label: 'Abgeschlossen' },
  { id: 'all', label: 'Alle' },
];

export default function ProjectsPage() {
  const { projects, loading, createProject, updateProject, deleteProject, refetch } = useProjects();

  // Agent integration
  const refreshCallbacks = useMemo(() => ({
    projects: refetch
  }), [refetch]);
  useAgent(refreshCallbacks);

  // UI State
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectModal, setProjectModal] = useState({ open: false, project: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Filter by status
    if (activeTab === 'active') {
      filtered = filtered.filter(p => p.status === 'active');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(p => p.status === 'completed');
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [projects, activeTab, searchQuery]);

  // Handlers
  const handleSaveProject = async (data) => {
    if (projectModal.project) {
      await updateProject(projectModal.project.id, data);
    } else {
      await createProject(data);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirm.id) {
      await deleteProject(deleteConfirm.id);
    }
  };

  const handleArchiveProject = async (id) => {
    await updateProject(id, { status: 'archived' });
  };

  // Loading skeleton
  if (loading && projects.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-accent" />
            Projekte
          </h1>
          <p className="text-text-secondary">
            Verwalte deine Projekte und verfolge den Fortschritt
          </p>
        </div>
        <button
          onClick={() => setProjectModal({ open: true, project: null })}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Neues Projekt
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status Tabs */}
        <div className="flex bg-surface-secondary rounded-lg p-1">
          {statusTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Projekte suchen..."
            className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-transparent rounded-lg text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={(p) => setProjectModal({ open: true, project: p })}
              onDelete={(id) => setDeleteConfirm({ open: true, id })}
              onArchive={handleArchiveProject}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <LayoutGrid className="w-12 h-12 mx-auto text-text-secondary opacity-50 mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {searchQuery ? 'Keine Projekte gefunden' : 'Keine Projekte'}
          </h3>
          <p className="text-text-secondary mb-4">
            {searchQuery
              ? `Keine Projekte für "${searchQuery}" gefunden.`
              : activeTab === 'active'
                ? 'Erstelle dein erstes Projekt, um loszulegen.'
                : 'Keine Projekte in dieser Kategorie.'}
          </p>
          {!searchQuery && activeTab === 'active' && (
            <button
              onClick={() => setProjectModal({ open: true, project: null })}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Projekt erstellen
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      {projects.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {projects.filter(p => p.status === 'active').length}
            </p>
            <p className="text-sm text-text-secondary">Aktive Projekte</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-success">
              {projects.filter(p => p.status === 'completed').length}
            </p>
            <p className="text-sm text-text-secondary">Abgeschlossen</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-text-secondary">
              {projects.reduce((acc, p) => acc + (p.todoCount || 0), 0)}
            </p>
            <p className="text-sm text-text-secondary">Todos gesamt</p>
          </div>
        </div>
      )}

      {/* Project Modal */}
      <ProjectModal
        isOpen={projectModal.open}
        onClose={() => setProjectModal({ open: false, project: null })}
        project={projectModal.project}
        onSave={handleSaveProject}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDeleteProject}
        title="Projekt löschen"
        message="Möchtest du dieses Projekt wirklich löschen? Alle zugehörigen Todos und Notizen werden ebenfalls gelöscht."
        confirmText="Löschen"
      />
    </div>
  );
}
