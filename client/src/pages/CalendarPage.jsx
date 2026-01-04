import { useState, useMemo, useEffect, useContext } from 'react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import CalendarView from '../components/calendar/CalendarView';
import EventModal from '../components/calendar/EventModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useCalendar, useCalendarConnections, getCalendarRange } from '../hooks/useCalendar';
import { AgentContext } from '../context/AgentContext';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventModal, setEventModal] = useState({ open: false, event: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

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

  // Register listener for AI Agent calendar updates
  useEffect(() => {
    const unsubscribe = registerRefreshListener('calendar', refetch);
    return unsubscribe;
  }, [registerRefreshListener, refetch]);

  const handleToggleCalendar = async (calendarId, isActive) => {
    await updateConnection(calendarId, { is_active: isActive });
  };

  const handleUpdateCalendarColor = async (calendarId, color) => {
    await updateConnection(calendarId, { color });
  };

  const handleSaveEvent = async (data) => {
    if (eventModal.event) {
      await updateEvent(eventModal.event.id, data);
    } else {
      await createEvent(data);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm.id) {
      await deleteEvent(deleteConfirm.id);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Kalender</h1>
        <p className="text-text-secondary">Verwalte deine Termine</p>
      </div>

      <CalendarView
        events={events}
        onEditEvent={(event) => setEventModal({ open: true, event })}
        onDeleteEvent={(id) => setDeleteConfirm({ open: true, id })}
        onAddEvent={() => setEventModal({ open: true, event: null })}
        onCreateEvent={createEvent}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        calendars={calendars}
        onToggleCalendar={handleToggleCalendar}
        onUpdateCalendarColor={handleUpdateCalendarColor}
      />

      <EventModal
        isOpen={eventModal.open}
        onClose={() => setEventModal({ open: false, event: null })}
        event={eventModal.event}
        onSave={handleSaveEvent}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Termin löschen"
        message="Möchtest du diesen Termin wirklich löschen?"
        confirmText="Löschen"
      />
    </div>
  );
}
