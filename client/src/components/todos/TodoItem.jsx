import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Clock, Folder, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { cn, formatRelativeDate } from '../../lib/utils';
import PriorityBadge from './PriorityBadge';

export default function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
  isDragging = false,
  showProject = true
}) {
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && todo.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-3 p-3 bg-surface rounded-lg border border-border',
        'hover:border-accent/30 transition-all duration-200',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg',
        todo.status === 'done' && 'opacity-60'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 p-1 text-text-secondary opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <label className="flex items-center mt-1 cursor-pointer">
        <input
          type="checkbox"
          checked={todo.status === 'done'}
          onChange={() => onToggle(todo.id)}
          className="checkbox"
        />
      </label>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => onEdit(todo)}
            className={cn(
              'text-sm font-medium text-text-primary text-left hover:text-accent transition-colors',
              todo.status === 'done' && 'line-through'
            )}
          >
            {todo.title}
          </button>
          <PriorityBadge priority={todo.priority} />
        </div>

        {todo.description && (
          <button
            onClick={() => onEdit(todo)}
            className="text-xs text-text-secondary mt-1 line-clamp-2 text-left hover:text-accent transition-colors"
          >
            {todo.description}
          </button>
        )}

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {todo.due_date && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue ? 'text-error' : 'text-text-secondary'
              )}
            >
              <Calendar className="w-3 h-3" />
              {formatRelativeDate(todo.due_date)}
              {todo.due_time && (
                <>
                  <Clock className="w-3 h-3 ml-1" />
                  {todo.due_time}
                </>
              )}
            </span>
          )}

          {showProject && todo.project_name && (
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              <Folder className="w-3 h-3" />
              {todo.project_name}
            </span>
          )}
        </div>
      </div>

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
            <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
              <button
                onClick={() => {
                  onEdit(todo);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
              >
                <Edit className="w-4 h-4" />
                Bearbeiten
              </button>
              <button
                onClick={() => {
                  onDelete(todo.id);
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
  );
}
