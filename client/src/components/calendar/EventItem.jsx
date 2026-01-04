import { Clock, MapPin, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn, formatTime } from '../../lib/utils';

export default function EventItem({ event, onEdit, onDelete, compact = false }) {
  const [showMenu, setShowMenu] = useState(false);

  const sourceColors = {
    outlook: 'bg-blue-500',
    icloud: 'bg-green-500',
    local: 'bg-accent',
    holidays: 'bg-red-500'
  };

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-surface-secondary cursor-pointer transition-colors"
        onClick={() => onEdit(event)}
      >
        <div
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            sourceColors[event.calendar_source] || 'bg-accent'
          )}
        />
        <span className="text-xs text-text-secondary w-12">
          {event.is_all_day ? 'Ganzt.' : formatTime(event.start_time)}
        </span>
        <span className="text-sm text-text-primary truncate flex-1">
          {event.title}
        </span>
      </div>
    );
  }

  return (
    <div className="group card p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-1 h-full min-h-[40px] rounded-full flex-shrink-0',
            sourceColors[event.calendar_source] || 'bg-accent'
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-text-primary">{event.title}</h4>
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
                        onEdit(event);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                    >
                      <Edit className="w-4 h-4" />
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => {
                        onDelete(event.id);
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

          {event.description && (
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">
              {event.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.is_all_day
                ? 'Ganztägig'
                : `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
