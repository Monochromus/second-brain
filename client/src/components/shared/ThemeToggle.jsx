import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Check } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

export default function ThemeToggle() {
  const { isDark, setLightTheme, setDarkTheme, accentColor, setAccentColor, accentColors, theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all duration-200"
        title="Design anpassen"
      >
        {isDark ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 w-64 glass p-4 z-50 animate-fade-in"
        >
          {/* Theme Toggle */}
          <div className="mb-4">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 block">
              Darstellung
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={setLightTheme}
                className={cn(
                  'p-2 rounded-lg border transition-all flex items-center justify-center gap-2',
                  !isDark
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-accent/50 text-text-secondary'
                )}
              >
                <Sun className="w-4 h-4" />
                <span className="text-sm">Hell</span>
              </button>
              <button
                onClick={setDarkTheme}
                className={cn(
                  'p-2 rounded-lg border transition-all flex items-center justify-center gap-2',
                  isDark
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-accent/50 text-text-secondary'
                )}
              >
                <Moon className="w-4 h-4" />
                <span className="text-sm">Dunkel</span>
              </button>
            </div>
          </div>

          {/* Accent Color Picker */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 block">
              Akzentfarbe
            </label>
            <div className="grid grid-cols-5 gap-2">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setAccentColor(color.id)}
                  className={cn(
                    'relative aspect-square rounded-lg border-2 transition-all flex items-center justify-center',
                    accentColor === color.id
                      ? 'border-text-primary scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{
                    backgroundColor: theme === 'dark' ? color.darkColor : color.color
                  }}
                  title={color.name}
                >
                  {accentColor === color.id && (
                    <Check className="w-3 h-3 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-2 text-center">
              {accentColors.find(c => c.id === accentColor)?.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
