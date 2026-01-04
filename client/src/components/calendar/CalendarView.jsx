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
  subWeeks,
  addWeeks,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar, CalendarDays } from 'lucide-react';
import { cn, formatTime } from '../../lib/utils';
import WeekView from './WeekView';
import EventPopover from './EventPopover';
import CalendarDropdown from './CalendarDropdown';

export default function CalendarView({
  events,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
  onCreateEvent,
  selectedDate,
  onDateSelect,
  calendars = [],
  onToggleCalendar,
  onUpdateCalendarColor
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [popoverEvent, setPopoverEvent] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const days = useMemo(() => {
    const days = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [calendarStart, calendarEnd]);

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // Filter events based on active calendars
  const activeCalendarSources = useMemo(() => {
    return calendars.filter(c => c.is_active).map(c => c.provider);
  }, [calendars]);

  const filteredEvents = useMemo(() => {
    if (calendars.length === 0) return events; // No filter if no calendars loaded
    return events.filter(event => {
      const source = event.calendar_source || 'local';
      return activeCalendarSources.includes(source);
    });
  }, [events, activeCalendarSources, calendars.length]);

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach((event) => {
      const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(event);
    });
    return map;
  }, [filteredEvents]);

  // Build dynamic colors from calendar connections
  const getCalendarColor = (source) => {
    const calendar = calendars.find(c => c.provider === source);
    if (calendar?.color) return calendar.color;
    // Fallback defaults
    switch (source) {
      case 'outlook': return '#3B82F6';
      case 'icloud': return '#10B981';
      default: return '#14B8A6';
    }
  };

  const sourceColors = useMemo(() => ({
    local: { hex: getCalendarColor('local') },
    outlook: { hex: getCalendarColor('outlook') },
    icloud: { hex: getCalendarColor('icloud') },
    holidays: { hex: getCalendarColor('holidays') || '#EF4444' }
  }), [calendars]);

  const handlePrev = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    onDateSelect(new Date());
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    setPopoverEvent(event);
    setPopoverAnchor(e.currentTarget);
  };

  const closePopover = () => {
    setPopoverEvent(null);
    setPopoverAnchor(null);
  };

  const getHeaderText = () => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: de });
    } else {
      const start = format(weekStart, 'd. MMM', { locale: de });
      const end = format(weekEnd, 'd. MMM yyyy', { locale: de });
      return `${start} - ${end}`;
    }
  };

  return (
    <div className="relative">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all duration-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-lg font-semibold text-text-primary min-w-[200px]">
              {getHeaderText()}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex items-center bg-surface-secondary rounded-lg p-1">
              <button
                onClick={() => setView('month')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                  view === 'month'
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <Calendar className="w-4 h-4" />
                Monat
              </button>
              <button
                onClick={() => setView('week')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                  view === 'week'
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <CalendarDays className="w-4 h-4" />
                Woche
              </button>
            </div>

            <button
              onClick={handleToday}
              className="btn btn-ghost text-sm"
            >
              Heute
            </button>

            {/* Calendar Filter Dropdown */}
            {calendars.length > 0 && (
              <CalendarDropdown
                calendars={calendars}
                onToggleCalendar={onToggleCalendar}
                onUpdateColor={onUpdateCalendarColor}
              />
            )}

            <button
              onClick={onAddEvent}
              className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-all duration-200 shadow-md hover:shadow-lg"
              title="Neuer Termin"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Content */}
        {view === 'month' ? (
          <div className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, idx) => (
                <div
                  key={day}
                  className={cn(
                    'text-center text-xs font-medium py-2',
                    idx >= 5 ? 'text-text-secondary/70' : 'text-text-secondary'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[dateKey] || [];
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={dateKey}
                    onClick={() => onDateSelect(day)}
                    className={cn(
                      'min-h-[100px] p-1.5 rounded-lg transition-all duration-200 cursor-pointer border border-transparent',
                      'hover:bg-surface-secondary hover:border-border',
                      !isCurrentMonth && 'opacity-40',
                      isSelected && 'bg-surface-secondary border-accent/30',
                      isWeekend && isCurrentMonth && 'bg-surface-secondary/30'
                    )}
                  >
                    {/* Day Number */}
                    <div className="flex justify-end mb-1">
                      <span
                        className={cn(
                          'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200',
                          isTodayDate && 'bg-red-500 text-white',
                          !isTodayDate && isCurrentMonth && 'text-text-primary',
                          !isTodayDate && !isCurrentMonth && 'text-text-secondary'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Events */}
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => {
                        const color = (sourceColors[event.calendar_source] || sourceColors.local).hex;
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => handleEventClick(event, e)}
                            className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer border-l-2 transition-all duration-200 hover:opacity-80"
                            style={{
                              backgroundColor: `${color}20`,
                              borderLeftColor: color
                            }}
                          >
                            <span className="text-text-secondary text-[10px] mr-1">
                              {event.is_all_day ? '' : formatTime(event.start_time)}
                            </span>
                            <span className="text-text-primary font-medium">
                              {event.title}
                            </span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-text-secondary px-1.5">
                          +{dayEvents.length - 3} weitere
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <WeekView
            events={filteredEvents}
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            onEventClick={handleEventClick}
            onCreateEvent={onCreateEvent}
            sourceColors={sourceColors}
          />
        )}
      </div>

      {/* Event Popover */}
      {popoverEvent && popoverAnchor && (
        <EventPopover
          event={popoverEvent}
          anchor={popoverAnchor}
          onClose={closePopover}
          onEdit={(e) => {
            onEditEvent(e);
            closePopover();
          }}
          onDelete={(id) => {
            onDeleteEvent(id);
            closePopover();
          }}
        />
      )}
    </div>
  );
}
