import { useMemo } from 'react';
import { format, isToday, isTomorrow, parseISO, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, MapPin, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, formatTime } from '../../lib/utils';

export default function TodayCalendar({ events, loading, onAdd }) {
  const groupedEvents = useMemo(() => {
    const today = new Date();
    const todayEvents = [];
    const thisWeekEvents = [];

    events.forEach((event) => {
      const eventDate = parseISO(event.start_time);
      if (isToday(eventDate)) {
        todayEvents.push(event);
      } else if (eventDate <= addDays(today, 7)) {
        thisWeekEvents.push(event);
      }
    });

    return { todayEvents, thisWeekEvents };
  }, [events]);

  if (loading) {
    return (
      <div className="notebook-section p-4">
        <div className="h-6 w-24 skeleton rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 skeleton rounded" />
          ))}
        </div>
      </div>
    );
  }

  const sourceColors = {
    outlook: 'border-l-blue-500',
    icloud: 'border-l-green-500',
    local: 'border-l-accent'
  };

  return (
    <div className="notebook-section">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            <h2 className="heading-3">Heute</h2>
          </div>
          <div className="flex items-center gap-2">
            {onAdd && (
              <button
                onClick={onAdd}
                className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors"
                title="Neuer Termin"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <Link
              to="/calendar"
              className="text-sm text-text-secondary hover:text-accent flex items-center gap-1 font-sans"
            >
              Alle anzeigen
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <p className="font-handwriting text-lg text-text-secondary mt-1">
          {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })}
        </p>
      </div>
      <div className="notebook-divider mx-4" />

      <div className="p-4">
        {groupedEvents.todayEvents.length > 0 ? (
          <div className="space-y-2">
            {groupedEvents.todayEvents.map((event) => (
              <div
                key={event.id}
                className={cn(
                  'p-3 bg-surface-secondary rounded-lg border-l-4',
                  sourceColors[event.calendar_source] || 'border-l-accent'
                )}
              >
                <p className="font-medium text-text-primary text-sm">{event.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
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
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-4">
            Keine Termine heute
          </p>
        )}
      </div>

      {groupedEvents.thisWeekEvents.length > 0 && (
        <>
          <div className="notebook-divider mx-4" />
          <div className="px-4 py-2">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide font-sans">
              Diese Woche
            </p>
          </div>
          <div className="px-4 pb-4">
            <div className="space-y-1">
              {groupedEvents.thisWeekEvents.slice(0, 5).map((event) => {
                const eventDate = parseISO(event.start_time);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-surface-secondary transition-colors"
                  >
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs text-text-secondary font-sans">
                        {format(eventDate, 'EEE', { locale: de })}
                      </p>
                      <p className="text-xl font-handwriting text-text-primary">
                        {format(eventDate, 'd')}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{event.title}</p>
                      <p className="text-xs text-text-secondary">
                        {event.is_all_day ? 'Ganztägig' : formatTime(event.start_time)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
