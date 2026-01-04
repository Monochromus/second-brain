import { useState, useMemo, useEffect, useContext } from 'react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import CalendarView from '../components/calendar/CalendarView';
import EventModal from '../components/calendar/EventModal';
import { useCalendar, useCalendarConnections, getCalendarRange } from '../hooks/useCalendar';
import { AgentContext } from '../context/AgentContext';
import { AuthContext } from '../context/AuthContext';
import { getHolidaysInRange, HOLIDAYS_CALENDAR } from '../lib/germanHolidays';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventModal, setEventModal] = useState({ open: false, event: null });

  const { user, updateSettings } = useContext(AuthContext);

  // Load holidays settings from user settings (with defaults)
  const holidaysSettings = user?.settings?.calendar?.holidays || {};
  const [showHolidays, setShowHolidays] = useState(holidaysSettings.enabled ?? true);
  const [holidaysColor, setHolidaysColor] = useState(holidaysSettings.color || '#EF4444');

  // Sync state with user settings when they load
  useEffect(() => {
    if (user?.settings?.calendar?.holidays) {
      const settings = user.settings.calendar.holidays;
      if (settings.enabled !== undefined) setShowHolidays(settings.enabled);
      if (settings.color) setHolidaysColor(settings.color);
    }
  }, [user?.settings?.calendar?.holidays]);

  const { registerRefreshListener } = useContext(AgentContext);

  const range = useMemo(() => {
    const start = startOfMonth(addMonths(currentMonth, -1));
    const end = endOfMonth(addMonths(currentMonth, 1));
    return {
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd')
    };
  }, [currentMonth]);

  const {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch
  } = useCalendar(range);

  const {
    connections: calendars,
    updateConnection
  } = useCalendarConnections();

  // Merge holidays with regular events (with custom color)
  const holidays = useMemo(() => {
    if (!showHolidays) return [];
    return getHolidaysInRange(range.start_date, range.end_date).map(h => ({
      ...h,
      color: holidaysColor
    }));
  }, [range.start_date, range.end_date, showHolidays, holidaysColor]);

  const allEvents = useMemo(() => {
    return [...events, ...holidays];
  }, [events, holidays]);

  // Create combined calendars list with holidays
  const allCalendars = useMemo(() => {
    const holidaysCalendar = {
      ...HOLIDAYS_CALENDAR,
      is_active: showHolidays,
      color: holidaysColor
    };
    return [holidaysCalendar, ...calendars];
  }, [calendars, showHolidays, holidaysColor]);

  // Register listener for AI Agent calendar updates
  useEffect(() => {
    const unsubscribe = registerRefreshListener('calendar', refetch);
    return unsubscribe;
  }, [registerRefreshListener, refetch]);

  // Helper to save holidays settings to user account
  const saveHolidaysSettings = async (updates) => {
    const currentSettings = user?.settings || {};
    const currentCalendarSettings = currentSettings.calendar || {};
    const currentHolidaysSettings = currentCalendarSettings.holidays || {};

    const newSettings = {
      ...currentSettings,
      calendar: {
        ...currentCalendarSettings,
        holidays: {
          ...currentHolidaysSettings,
          ...updates
        }
      }
    };

    await updateSettings({ settings: newSettings }, { silent: true });
  };

  const handleToggleCalendar = async (calendarId, isActive) => {
    if (calendarId === 'holidays') {
      setShowHolidays(isActive);
      await saveHolidaysSettings({ enabled: isActive });
      return;
    }
    await updateConnection(calendarId, { is_active: isActive });
  };

  const handleUpdateCalendarColor = async (calendarId, color) => {
    if (calendarId === 'holidays') {
      setHolidaysColor(color);
      await saveHolidaysSettings({ color });
      return;
    }
    await updateConnection(calendarId, { color });
  };

  const handleSaveEvent = async (data) => {
    if (eventModal.event) {
      await updateEvent(eventModal.event.id, data);
    } else {
      await createEvent(data);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Kalender</h1>
        <p className="text-text-secondary">Verwalte deine Termine</p>
      </div>

      <CalendarView
        events={allEvents}
        onEditEvent={(event) => {
          // Don't allow editing holidays
          if (event.is_holiday) return;
          setEventModal({ open: true, event });
        }}
        onDeleteEvent={(id) => {
          // Don't allow deleting holidays
          if (String(id).startsWith('holiday-')) return;
          deleteEvent(id);
        }}
        onAddEvent={() => setEventModal({ open: true, event: null })}
        onCreateEvent={createEvent}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        calendars={allCalendars}
        onToggleCalendar={handleToggleCalendar}
        onUpdateCalendarColor={handleUpdateCalendarColor}
      />

      <EventModal
        isOpen={eventModal.open}
        onClose={() => setEventModal({ open: false, event: null })}
        event={eventModal.event}
        onSave={handleSaveEvent}
      />
    </div>
  );
}
