import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Check, Sparkles, Smartphone, ExternalLink, ArrowRight, Settings } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

export default function ThemeSetupModal({ isOpen, onComplete }) {
  const navigate = useNavigate();
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    accentColors,
    markThemeConfigured
  } = useTheme();

  const [step, setStep] = useState(1); // 1 = Theme, 2 = Kurzbefehl
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

  const handleNextStep = () => {
    setStep(2);
  };

  const handleComplete = () => {
    markThemeConfigured();
    onComplete();
  };

  const handleGoToSettings = () => {
    markThemeConfigured();
    onComplete();
    navigate('/settings');
  };

  const SHORTCUT_URL = 'https://www.icloud.com/shortcuts/32bbb0645e6f4046b9fa93bc5500a759';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] glass-strong overflow-hidden animate-slide-up flex flex-col">
        {step === 1 ? (
          <>
            {/* Step 1: Theme Selection */}
            <div className="p-4 sm:p-6 text-center border-b border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5 flex-shrink-0">
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

            <div className="p-4 sm:p-6 border-t border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5 flex-shrink-0">
              <button
                onClick={handleNextStep}
                className="w-full btn btn-primary py-2.5 sm:py-3 text-sm sm:text-base flex items-center justify-center gap-2"
              >
                Weiter
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Shortcut Setup */}
            <div className="p-4 sm:p-6 text-center border-b border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5 flex-shrink-0">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent mb-3 sm:mb-4">
                <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-text-primary">iOS Kurzbefehl einrichten</h2>
              <p className="text-text-secondary mt-1 sm:mt-2 text-sm sm:text-base">
                Erfasse Notizen, Todos und Bilder direkt von deinem iPhone.
              </p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">1</span>
                  <div>
                    <p className="text-text-primary font-medium">Kurzbefehl herunterladen</p>
                    <p className="text-text-secondary text-xs mt-0.5">Öffne den Link auf deinem iPhone</p>
                  </div>
                </div>

                <a
                  href={SHORTCUT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-accent/10 hover:bg-accent/20 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-text-primary font-medium group-hover:text-accent transition-colors">Second Brain Quick Capture</p>
                    <p className="text-text-secondary text-xs">iCloud Kurzbefehl</p>
                  </div>
                </a>

                <div className="flex items-start gap-3 pt-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">2</span>
                  <div>
                    <p className="text-text-primary font-medium">Shortcut Key generieren</p>
                    <p className="text-text-secondary text-xs mt-0.5">Erstelle einen persönlichen Key in den Einstellungen</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">3</span>
                  <div>
                    <p className="text-text-primary font-medium">Key im Kurzbefehl eintragen</p>
                    <p className="text-text-secondary text-xs mt-0.5">Bearbeite den Kurzbefehl in der Kurzbefehle-App und trage deinen Key ein</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-surface-secondary rounded-xl text-xs text-text-secondary">
                <p className="font-medium text-text-primary mb-1">Tipp:</p>
                <p>Füge den Kurzbefehl zum Home-Bildschirm hinzu oder aktiviere ihn per Siri. Du kannst auch jedes Foto über den Teilen-Button direkt an den Pocket Assistent senden – zusammen mit einer Textanfrage.</p>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5 flex-shrink-0 space-y-2">
              <button
                onClick={handleGoToSettings}
                className="w-full btn btn-primary py-2.5 sm:py-3 text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Zu den Einstellungen
              </button>
              <button
                onClick={handleComplete}
                className="w-full btn btn-secondary py-2.5 sm:py-3 text-sm sm:text-base"
              >
                Später einrichten
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
