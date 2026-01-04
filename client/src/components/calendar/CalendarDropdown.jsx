import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Palette } from 'lucide-react';
import { cn } from '../../lib/utils';

const CALENDAR_COLORS = [
  { name: 'Petrol', value: '#14B8A6' },
  { name: 'Blau', value: '#3B82F6' },
  { name: 'Lila', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rot', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Gelb', value: '#EAB308' },
  { name: 'Grün', value: '#22C55E' },
  { name: 'Grau', value: '#6B7280' },
];

export default function CalendarDropdown({
  calendars,
  onToggleCalendar,
  onUpdateColor,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setColorPickerFor(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCount = calendars.filter(c => c.is_active).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
          'bg-surface-secondary hover:bg-border text-text-primary'
        )}
      >
        <div className="flex -space-x-1">
          {calendars.filter(c => c.is_active).slice(0, 3).map((cal) => (
            <div
              key={cal.id}
              className="w-3 h-3 rounded-full border-2 border-surface"
              style={{ backgroundColor: cal.color }}
            />
          ))}
        </div>
        <span className="hidden sm:inline">
          {activeCount} Kalender
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface rounded-xl shadow-xl border border-border z-50 popover-animation overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Kalender</h3>
            <p className="text-xs text-text-secondary">Anzeige ein-/ausschalten</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {calendars.map((calendar) => (
              <div
                key={calendar.id}
                className="relative"
              >
                <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-secondary transition-colors">
                  {/* Checkbox */}
                  <button
                    onClick={() => onToggleCalendar(calendar.id, !calendar.is_active)}
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center border-2 transition-all',
                      calendar.is_active
                        ? 'border-transparent'
                        : 'border-border bg-transparent'
                    )}
                    style={{
                      backgroundColor: calendar.is_active ? calendar.color : undefined
                    }}
                  >
                    {calendar.is_active && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>

                  {/* Color dot & name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-primary truncate">
                        {calendar.name}
                      </span>
                    </div>
                    {calendar.provider !== 'local' && (
                      <span className="text-[10px] text-text-secondary capitalize">
                        {calendar.provider}
                      </span>
                    )}
                  </div>

                  {/* Color picker button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerFor(colorPickerFor === calendar.id ? null : calendar.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-border transition-colors"
                    title="Farbe ändern"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: calendar.color }}
                    />
                  </button>
                </div>

                {/* Color picker */}
                {colorPickerFor === calendar.id && (
                  <div className="px-3 pb-3 pt-1 bg-surface-secondary/50">
                    <div className="grid grid-cols-5 gap-1.5">
                      {CALENDAR_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => {
                            onUpdateColor(calendar.id, color.value);
                            setColorPickerFor(null);
                          }}
                          className={cn(
                            'w-7 h-7 rounded-full transition-all duration-200 hover:scale-110',
                            'flex items-center justify-center',
                            calendar.color === color.value && 'ring-2 ring-offset-2 ring-offset-surface ring-text-primary'
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        >
                          {calendar.color === color.value && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {calendars.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-sm text-text-secondary">
                Keine Kalender verbunden
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
