import { useMemo, useState, useEffect, useRef } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isToday,
  parseISO,
  setHours,
  setMinutes
} from 'date-fns';
import { de } from 'date-fns/locale';
import { cn, formatTime } from '../../lib/utils';

const HOUR_HEIGHT = 60;
const START_HOUR = 6;
const END_HOUR = 22;

export default function WeekView({
  events,
  currentDate,
  selectedDate,
  onDateSelect,
  onEventClick,
  onCreateEvent,
  sourceColors
}) {
  const [quickAddSlot, setQuickAddSlot] = useState(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [currentTimeOffset, setCurrentTimeOffset] = useState(0);
  const quickAddInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const hours = useMemo(() => {
    return Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  }, []);

  // Group events by date
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

  // Separate all-day events
  const allDayEventsByDate = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      if (event.is_all_day) {
        const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push(event);
      }
    });
    return map;
  }, [events]);

  // Update current time indicator
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const offset = ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      setCurrentTimeOffset(offset);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollTo = Math.max(0, (currentHour - START_HOUR - 2) * HOUR_HEIGHT);
      scrollContainerRef.current.scrollTop = scrollTo;
    }
  }, []);

  // Focus quick add input
  useEffect(() => {
    if (quickAddSlot && quickAddInputRef.current) {
      quickAddInputRef.current.focus();
    }
  }, [quickAddSlot]);

  const getEventStyle = (event) => {
    const startTime = parseISO(event.start_time);
    const endTime = parseISO(event.end_time);
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 24);

    return { top, height };
  };

  const handleSlotClick = (day, hour) => {
    setQuickAddSlot({ day, hour });
    setQuickAddTitle('');
  };

  const handleQuickAddSubmit = async () => {
    if (!quickAddTitle.trim() || !quickAddSlot) return;

    const startTime = setMinutes(setHours(quickAddSlot.day, quickAddSlot.hour), 0);
    const endTime = setMinutes(setHours(quickAddSlot.day, quickAddSlot.hour + 1), 0);

    await onCreateEvent({
      title: quickAddTitle,
      start_time: format(startTime, "yyyy-MM-dd'T'HH:mm:ss"),
      end_time: format(endTime, "yyyy-MM-dd'T'HH:mm:ss"),
      is_all_day: false
    });

    setQuickAddSlot(null);
    setQuickAddTitle('');
  };

  const handleQuickAddKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleQuickAddSubmit();
    } else if (e.key === 'Escape') {
      setQuickAddSlot(null);
      setQuickAddTitle('');
    }
  };

  const hasAllDayEvents = weekDays.some(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return (allDayEventsByDate[dateKey] || []).length > 0;
  });

  return (
    <div className="flex flex-col h-[700px]">
      {/* Header with day names */}
      <div className="flex border-b border-border bg-surface sticky top-0 z-10">
        <div className="w-16 flex-shrink-0" />
        {weekDays.map((day) => {
          const isSelectedDay = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                'flex-1 py-3 text-center cursor-pointer transition-colors',
                'hover:bg-surface-secondary',
                isSelectedDay && 'bg-surface-secondary'
              )}
            >
              <div className="text-xs text-text-secondary font-medium">
                {format(day, 'EEE', { locale: de })}
              </div>
              <div
                className={cn(
                  'w-8 h-8 mx-auto mt-1 flex items-center justify-center rounded-full text-lg font-semibold transition-all',
                  isTodayDate && 'bg-red-500 text-white',
                  !isTodayDate && 'text-text-primary'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      {hasAllDayEvents && (
        <div className="flex border-b border-border bg-surface-secondary/50">
          <div className="w-16 flex-shrink-0 text-[10px] text-text-secondary p-2 text-right">
            Ganzt.
          </div>
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayAllDayEvents = allDayEventsByDate[dateKey] || [];

            return (
              <div
                key={`allday-${day.toISOString()}`}
                className="flex-1 p-1 min-h-[40px] border-l border-border"
              >
                {dayAllDayEvents.map((event) => {
                  const color = (sourceColors[event.calendar_source] || sourceColors.local).hex;
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => onEventClick(event, e)}
                      className="text-xs px-2 py-1 rounded truncate cursor-pointer mb-1 border-l-2 transition-all duration-200 hover:opacity-80"
                      style={{
                        backgroundColor: `${color}20`,
                        borderLeftColor: color
                      }}
                    >
                      {event.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="flex relative">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-[11px] text-text-secondary text-right pr-3 relative"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2 right-3">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = (eventsByDate[dateKey] || []).filter(e => !e.is_all_day);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className="flex-1 relative border-l border-border"
              >
                {/* Hour slots */}
                {hours.map((hour) => {
                  const isQuickAddHere = quickAddSlot &&
                    isSameDay(quickAddSlot.day, day) &&
                    quickAddSlot.hour === hour;

                  return (
                    <div
                      key={hour}
                      onClick={() => !isQuickAddHere && handleSlotClick(day, hour)}
                      className={cn(
                        'border-b border-[rgba(128,128,128,0.15)] cursor-pointer transition-colors',
                        'hover:bg-surface-secondary/50'
                      )}
                      style={{ height: HOUR_HEIGHT }}
                    >
                      {isQuickAddHere && (
                        <div className="absolute inset-x-1 bg-accent/20 rounded p-1 z-20 border border-accent">
                          <input
                            ref={quickAddInputRef}
                            type="text"
                            value={quickAddTitle}
                            onChange={(e) => setQuickAddTitle(e.target.value)}
                            onKeyDown={handleQuickAddKeyDown}
                            onBlur={() => {
                              if (!quickAddTitle.trim()) {
                                setQuickAddSlot(null);
                              }
                            }}
                            placeholder="Neuer Termin..."
                            className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
                          />
                          <div className="text-[10px] text-text-secondary mt-0.5">
                            Enter speichern, Esc abbrechen
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {isTodayDate && currentTimeOffset >= 0 && currentTimeOffset <= (END_HOUR - START_HOUR) * HOUR_HEIGHT && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: currentTimeOffset }}
                  >
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Events */}
                {dayEvents.map((event) => {
                  const { top, height } = getEventStyle(event);
                  const color = (sourceColors[event.calendar_source] || sourceColors.local).hex;

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => onEventClick(event, e)}
                      className="absolute left-1 right-1 rounded px-2 py-1 cursor-pointer overflow-hidden border-l-[3px] transition-all duration-200 hover:opacity-90 hover:shadow-md"
                      style={{
                        top,
                        height,
                        minHeight: 24,
                        backgroundColor: `${color}20`,
                        borderLeftColor: color
                      }}
                    >
                      <div className="text-xs font-medium text-text-primary truncate">
                        {event.title}
                      </div>
                      {height > 40 && (
                        <div className="text-[10px] text-text-secondary">
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </div>
                      )}
                      {height > 60 && event.location && (
                        <div className="text-[10px] text-text-secondary truncate">
                          {event.location}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
