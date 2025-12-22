import { Folder, Plus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProjectCard from '../projects/ProjectCard';

export default function ProjectGrid({ projects, loading, onEdit, onDelete, onArchive, onAdd }) {
  if (loading) {
    return (
      <div className="card p-4">
        <div className="h-6 w-24 skeleton rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 skeleton rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-text-primary">Projekte</h2>
            <span className="text-sm text-text-secondary">({projects.length})</span>
          </div>
          <button onClick={onAdd} className="btn btn-primary btn-sm py-1.5">
            <Plus className="w-4 h-4" />
            Neu
          </button>
        </div>
      </div>

      <div className="p-4">
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Folder className="w-12 h-12 mx-auto text-text-secondary opacity-50 mb-4" />
            <p className="text-sm text-text-secondary">Noch keine Projekte</p>
            <button onClick={onAdd} className="btn btn-secondary mt-4">
              <Plus className="w-4 h-4" />
              Projekt erstellen
            </button>
          </div>
        )}

        {projects.length > 4 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-text-secondary hover:text-accent flex items-center gap-1 mx-auto">
              Alle {projects.length} Projekte anzeigen
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
