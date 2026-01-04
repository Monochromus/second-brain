import { useEffect, useState, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, MapPin, FileText, Edit, Trash2, X } from 'lucide-react';
import { formatTime } from '../../lib/utils';

export default function EventPopover({ event, anchor, onClose, onEdit, onDelete }) {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position
  useEffect(() => {
    if (!anchor || !popoverRef.current) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;

    // Adjust if going off right edge
    if (left + popoverRect.width > viewportWidth - 16) {
      left = viewportWidth - popoverRect.width - 16;
    }

    // Adjust if going off left edge
    if (left < 16) {
      left = 16;
    }

    // Adjust if going off bottom edge - show above instead
    if (top + popoverRect.height > viewportHeight - 16) {
      top = anchorRect.top - popoverRect.height - 8;
    }

    // Ensure not going off top
    if (top < 16) {
      top = 16;
    }

    setPosition({ top, left });
  }, [anchor]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const getSourceColor = (source, eventColor) => {
    // Use event's custom color if available
    if (eventColor) return eventColor;
    switch (source) {
      case 'outlook': return '#3B82F6';
      case 'icloud': return '#10B981';
      case 'holidays': return '#EF4444';
      default: return '#14B8A6';
    }
  };

  const sourceLabels = {
    outlook: 'Outlook',
    icloud: 'iCloud',
    local: 'Lokal',
    holidays: 'Feiertag'
  };

  const startDate = parseISO(event.start_time);
  const endDate = parseISO(event.end_time);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed z-50 w-80 bg-surface rounded-xl shadow-xl border border-border popover-animation"
        style={{ top: position.top, left: position.left }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: getSourceColor(event.calendar_source, event.color) }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary text-lg leading-tight">
                {event.title}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {sourceLabels[event.calendar_source] || 'Lokal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="text-text-primary">
                {format(startDate, 'EEEE, d. MMMM yyyy', { locale: de })}
              </div>
              <div className="text-text-secondary">
                {event.is_all_day
                  ? 'Ganztägig'
                  : `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" />
              <div className="text-sm text-text-primary">{event.location}</div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-text-secondary mt-0.5 flex-shrink-0" />
              <div className="text-sm text-text-secondary line-clamp-3">
                {event.description}
              </div>
            </div>
          )}
        </div>

        {/* Actions - not shown for holidays */}
        {!event.is_holiday && (
          <div className="flex items-center gap-2 p-4 pt-2 border-t border-border">
            <button
              onClick={() => onEdit(event)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary hover:bg-border text-text-primary text-sm font-medium transition-colors"
            >
              <Edit className="w-4 h-4" />
              Bearbeiten
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-error/10 hover:bg-error/20 text-error text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
