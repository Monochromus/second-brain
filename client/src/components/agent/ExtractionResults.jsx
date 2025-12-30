import { useState, useMemo } from 'react';
import {
  Calendar,
  CheckSquare,
  FileText,
  User,
  Check,
  X,
  Loader2,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ExtractionResults({
  visionResponse,
  extractions,
  onConfirm,
  onCancel,
  isConfirming
}) {
  // Track selected items by tempId
  const [selectedItems, setSelectedItems] = useState(() => {
    const initial = new Set();
    extractions.appointments?.forEach(item => initial.add(item.tempId));
    extractions.todos?.forEach(item => initial.add(item.tempId));
    extractions.notes?.forEach(item => initial.add(item.tempId));
    extractions.contacts?.forEach(item => initial.add(item.tempId));
    return initial;
  });

  const toggleItem = (tempId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set();
    extractions.appointments?.forEach(item => all.add(item.tempId));
    extractions.todos?.forEach(item => all.add(item.tempId));
    extractions.notes?.forEach(item => all.add(item.tempId));
    extractions.contacts?.forEach(item => all.add(item.tempId));
    setSelectedItems(all);
  };

  const selectNone = () => {
    setSelectedItems(new Set());
  };

  const handleConfirm = () => {
    const items = [];

    extractions.appointments?.forEach(apt => {
      if (selectedItems.has(apt.tempId)) {
        items.push({ type: 'appointment', data: apt });
      }
    });

    extractions.todos?.forEach(todo => {
      if (selectedItems.has(todo.tempId)) {
        items.push({ type: 'todo', data: todo });
      }
    });

    extractions.notes?.forEach(note => {
      if (selectedItems.has(note.tempId)) {
        items.push({ type: 'note', data: note });
      }
    });

    extractions.contacts?.forEach(contact => {
      if (selectedItems.has(contact.tempId)) {
        items.push({ type: 'contact', data: contact });
      }
    });

    onConfirm(items);
  };

  const totalItems = useMemo(() => {
    return (
      (extractions.appointments?.length || 0) +
      (extractions.todos?.length || 0) +
      (extractions.notes?.length || 0) +
      (extractions.contacts?.length || 0)
    );
  }, [extractions]);

  const hasItems = totalItems > 0;

  return (
    <div className="space-y-3">
      {/* LLM Response */}
      {visionResponse && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <p className="text-sm text-text-primary flex-1 whitespace-pre-wrap">
            {visionResponse}
          </p>
        </div>
      )}

      {/* Extraction Results */}
      {hasItems ? (
        <div className="glass-subtle rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">
              Erkannte Informationen
            </h3>
            <div className="flex gap-2 text-xs">
              <button
                onClick={selectAll}
                className="text-accent hover:underline"
              >
                Alle
              </button>
              <span className="text-text-secondary">|</span>
              <button
                onClick={selectNone}
                className="text-text-secondary hover:text-text-primary"
              >
                Keine
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
            {/* Termine */}
            {extractions.appointments?.length > 0 && (
              <Section icon={Calendar} title="Termine" color="blue">
                {extractions.appointments.map(apt => (
                  <ItemRow
                    key={apt.tempId}
                    selected={selectedItems.has(apt.tempId)}
                    onToggle={() => toggleItem(apt.tempId)}
                    title={apt.title}
                    subtitle={formatAppointmentSubtitle(apt)}
                  />
                ))}
              </Section>
            )}

            {/* Todos */}
            {extractions.todos?.length > 0 && (
              <Section icon={CheckSquare} title="Aufgaben" color="green">
                {extractions.todos.map(todo => (
                  <ItemRow
                    key={todo.tempId}
                    selected={selectedItems.has(todo.tempId)}
                    onToggle={() => toggleItem(todo.tempId)}
                    title={todo.title}
                    subtitle={todo.dueDate ? `Fällig: ${formatDate(todo.dueDate)}` : null}
                  />
                ))}
              </Section>
            )}

            {/* Notizen */}
            {extractions.notes?.length > 0 && (
              <Section icon={FileText} title="Notizen" color="amber">
                {extractions.notes.map(note => (
                  <ItemRow
                    key={note.tempId}
                    selected={selectedItems.has(note.tempId)}
                    onToggle={() => toggleItem(note.tempId)}
                    title={note.title}
                    subtitle={note.content?.substring(0, 50) + (note.content?.length > 50 ? '...' : '')}
                  />
                ))}
              </Section>
            )}

            {/* Kontakte */}
            {extractions.contacts?.length > 0 && (
              <Section icon={User} title="Kontakte" color="purple">
                {extractions.contacts.map(contact => (
                  <ItemRow
                    key={contact.tempId}
                    selected={selectedItems.has(contact.tempId)}
                    onToggle={() => toggleItem(contact.tempId)}
                    title={contact.name}
                    subtitle={contact.email || contact.phone || contact.company}
                  />
                ))}
              </Section>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/10 flex gap-2 justify-end">
            <button
              onClick={onCancel}
              disabled={isConfirming}
              className="btn btn-secondary text-sm"
            >
              <X className="w-4 h-4 mr-1" />
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedItems.size === 0 || isConfirming}
              className="btn btn-primary text-sm"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Erstelle...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  {selectedItems.size} erstellen
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-subtle p-4 rounded-xl text-center">
          <p className="text-text-secondary text-sm">
            Keine Termine, Aufgaben oder Notizen im Bild erkannt.
          </p>
          <button
            onClick={onCancel}
            className="mt-3 btn btn-secondary text-sm"
          >
            Schließen
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, color, children }) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    green: 'text-green-600 dark:text-green-400 bg-green-500/10',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1 rounded', colorClasses[color])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function ItemRow({ selected, onToggle, title, subtitle }) {
  return (
    <label
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg cursor-pointer',
        'transition-colors duration-150',
        selected
          ? 'bg-accent/10'
          : 'hover:bg-white/20 dark:hover:bg-white/5'
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-0.5 rounded border-white/30 text-accent focus:ring-accent"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-text-secondary truncate">{subtitle}</p>
        )}
      </div>
    </label>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatAppointmentSubtitle(apt) {
  const parts = [];
  if (apt.date) parts.push(formatDate(apt.date));
  if (apt.startTime) {
    let timeStr = apt.startTime;
    if (apt.endTime) timeStr += ` - ${apt.endTime}`;
    parts.push(timeStr);
  }
  if (apt.location) parts.push(apt.location);
  return parts.join(' • ');
}
