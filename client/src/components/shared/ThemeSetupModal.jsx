import { useState } from 'react';
import { Sun, Moon, Check, Sparkles } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

export default function ThemeSetupModal({ isOpen, onComplete }) {
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    accentColors,
    markThemeConfigured
  } = useTheme();

  const [previewTheme, setPreviewTheme] = useState(theme);
  const [previewAccent, setPreviewAccent] = useState(accentColor);

  if (!isOpen) return null;

  const handleThemeChange = (newTheme) => {
    setPreviewTheme(newTheme);
    setTheme(newTheme);
  };

  const handleAccentChange = (colorId) => {
    setPreviewAccent(colorId);
    setAccentColor(colorId);
  };

  const handleSave = () => {
    markThemeConfigured();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] bg-surface rounded-2xl shadow-xl border border-border overflow-hidden animate-slide-up flex flex-col">
        <div className="p-4 sm:p-6 text-center border-b border-border bg-surface-secondary flex-shrink-0">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent mb-3 sm:mb-4">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Personalisiere deinen Pocket Assistent</h2>
          <p className="text-text-secondary mt-1 sm:mt-2 text-sm sm:text-base">
            Wähle dein bevorzugtes Erscheinungsbild.
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2 sm:mb-3">
              Darstellung
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={cn(
                  'p-3 sm:p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 sm:gap-3',
                  previewTheme === 'light'
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50'
                )}
              >
                <div className="w-full h-12 sm:h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">Hell</span>
                  {previewTheme === 'light' && (
                    <Check className="w-4 h-4 text-accent" />
                  )}
                </div>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={cn(
                  'p-3 sm:p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 sm:gap-3',
                  previewTheme === 'dark'
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50'
                )}
              >
                <div className="w-full h-12 sm:h-16 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center">
                  <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">Dunkel</span>
                  {previewTheme === 'dark' && (
                    <Check className="w-4 h-4 text-accent" />
                  )}
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2 sm:mb-3">
              Akzentfarbe
            </label>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleAccentChange(color.id)}
                  className={cn(
                    'relative aspect-square rounded-lg sm:rounded-xl border-2 transition-all flex items-center justify-center',
                    previewAccent === color.id
                      ? 'border-text-primary scale-105'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{
                    backgroundColor: previewTheme === 'dark' ? color.darkColor : color.color
                  }}
                  title={color.name}
                >
                  {previewAccent === color.id && (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-1.5 sm:mt-2 text-center">
              {accentColors.find(c => c.id === previewAccent)?.name}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-border bg-surface-secondary flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full btn btn-primary py-2.5 sm:py-3 text-sm sm:text-base"
          >
            Speichern und loslegen
          </button>
        </div>
      </div>
    </div>
  );
}
