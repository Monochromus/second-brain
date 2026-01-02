import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import EventItem from './EventItem';

export default function CalendarView({
  events,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
  selectedDate,
  onDateSelect
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState('month');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(() => {
    const days = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [calendarStart, calendarEnd]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(event);
    });
    return map;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  }, [selectedDate, eventsByDate]);

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-text-primary min-w-[180px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: de })}
              </h2>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCurrentMonth(new Date());
                  onDateSelect(new Date());
                }}
                className="btn btn-ghost text-sm"
              >
                Heute
              </button>
              <button
                onClick={onAddEvent}
                className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors"
                title="Neuer Termin"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-text-secondary py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[dateKey] || [];
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={dateKey}
                    onClick={() => onDateSelect(day)}
                    className={cn(
                      'aspect-square p-1 rounded-lg text-sm transition-all relative',
                      'hover:bg-surface-secondary',
                      !isSameMonth(day, currentMonth) && 'text-text-secondary opacity-50',
                      isSameMonth(day, currentMonth) && 'text-text-primary',
                      isToday(day) && 'font-bold',
                      isSelected && 'bg-accent text-white hover:bg-accent-hover'
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center w-7 h-7 mx-auto rounded-full',
                        isToday(day) && !isSelected && 'bg-accent/20 text-accent'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-1 h-1 rounded-full',
                              isSelected ? 'bg-white' : 'bg-accent'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="w-80">
        <div className="card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-text-primary">
              {selectedDate
                ? format(selectedDate, 'EEEE, d. MMMM', { locale: de })
                : 'Wähle einen Tag'}
            </h3>
          </div>
          <div className="p-4">
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary text-center py-8">
                Keine Termine an diesem Tag
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
