import { ExternalLink, MoreVertical, Edit, Trash, Tag, Folder } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function ResourceCard({ resource, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCardClick = (e) => {
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    } else if (onEdit) {
      onEdit(resource);
    }
  };

  return (
    <div
      className="notebook-card p-4 group cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">
            {resource.title}
          </h3>
          {resource.category && (
            <span className="text-xs text-accent font-sans mt-1 inline-block">
              {resource.category}
            </span>
          )}
        </div>

        <div className="relative flex items-center gap-1" ref={menuRef}>
          {resource.url && (
            <ExternalLink className="w-4 h-4 text-text-secondary" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 rounded-lg text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-surface-secondary transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(resource);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-secondary flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Bearbeiten
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(resource.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-error hover:bg-surface-secondary flex items-center gap-2"
              >
                <Trash className="w-4 h-4" />
                Löschen
              </button>
            </div>
          )}
        </div>
      </div>

      {resource.content && (
        <p className="text-sm text-text-secondary mt-2 line-clamp-2">
          {resource.content}
        </p>
      )}

      {/* PARA: Show linked Projects */}
      {resource.projects && resource.projects.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {resource.projects.map((project) => (
            <span
              key={project.id}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: project.color ? `${project.color}20` : 'var(--surface-secondary)',
                color: project.color || 'var(--text-secondary)'
              }}
            >
              <Folder className="w-3 h-3" />
              {project.name}
            </span>
          ))}
        </div>
      )}

      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {resource.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface text-text-secondary"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {resource.tags.length > 3 && (
            <span className="text-xs text-text-secondary">
              +{resource.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
