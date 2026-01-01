import { Link } from 'react-router-dom';
import { CheckCircle, FileText, Calendar, MoreHorizontal, Trash2, Edit, Archive, Folder } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useState } from 'react';
import { formatRelativeDate } from '../../lib/utils';

// Convert kebab-case to PascalCase for lucide-react
const toPascalCase = (str) =>
  str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

export default function ProjectCard({ project, onEdit, onDelete, onArchive }) {
  const [showMenu, setShowMenu] = useState(false);
  const progress = project.stats?.progress || 0;

  // Get icon component dynamically
  const iconName = project.icon || 'folder';
  const pascalName = toPascalCase(iconName);
  const IconComponent = LucideIcons[pascalName] || Folder;

  return (
    <div className="notebook-card p-4 group">
      <div className="flex items-start justify-between mb-3">
        <Link
          to={`/project/${project.id}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: project.color + '15' }}
          >
            <IconComponent className="w-5 h-5" style={{ color: project.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{project.name}</h3>
            {project.area_name && (
              <span className="text-xs text-text-secondary font-handwriting">
                {project.area_name}
              </span>
            )}
          </div>
        </Link>

        <div className="relative">
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
              <div className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
                <button
                  onClick={() => {
                    onEdit(project);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary font-sans"
                >
                  <Edit className="w-4 h-4" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => {
                    onArchive(project.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary font-sans"
                >
                  <Archive className="w-4 h-4" />
                  Archivieren
                </button>
                <button
                  onClick={() => {
                    onDelete(project.id);
                    setShowMenu(false);
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

      {project.description && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1 font-sans">
          <span>Fortschritt</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: project.color
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-text-secondary font-sans">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {project.stats?.completedTodos || 0}/{project.stats?.totalTodos || 0}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {project.stats?.noteCount || 0}
        </span>
        {project.deadline && (
          <span className="flex items-center gap-1 ml-auto font-handwriting text-sm">
            <Calendar className="w-3 h-3" />
            {formatRelativeDate(project.deadline)}
          </span>
        )}
      </div>
    </div>
  );
}
