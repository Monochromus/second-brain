import { useState, useEffect } from 'react';
import { User, Key, Calendar, Palette, RefreshCw, Bot, Eye, EyeOff, Check, Smartphone, Copy, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useCalendarConnections } from '../hooks/useCalendar';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { user, updateSettings } = useAuth();
  const { theme, setLightTheme, setDarkTheme, accentColor, setAccentColor, accentColors } = useTheme();
  const { connections, addConnection, removeConnection, refetch: refetchConnections } = useCalendarConnections();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [apiKeyForm, setApiKeyForm] = useState({
    openaiApiKey: user?.settings?.openaiApiKey || '',
    openaiModel: user?.settings?.openaiModel || ''
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const availableModels = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Günstig & schnell - $0.15/1M Tokens', tier: 'free' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Besser als 4o-mini, schnell', tier: 'pro' },
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Leistungsstark - ersetzt GPT-4o', tier: 'pro' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Sehr günstig - $0.05/1M Tokens', tier: 'pro' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Schnelles GPT-5 - $0.50/1M Tokens', tier: 'pro' },
    { id: 'gpt-5', name: 'GPT-5', description: 'Neuestes Flaggschiff - $1.25/1M Tokens', tier: 'pro' },
    { id: 'o3-mini', name: 'o3 Mini', description: 'Reasoning-Modell für komplexe Logik', tier: 'pro' }
  ];

  const hasOwnApiKey = Boolean(apiKeyForm.openaiApiKey?.trim());

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [calendarForm, setCalendarForm] = useState({
    provider: 'icloud',
    calendar_url: '',
    username: '',
    password: ''
  });

  const [saving, setSaving] = useState({
    profile: false,
    apiKey: false,
    password: false,
    calendar: false
  });

  // Personal Shortcut Key state
  const [shortcutKey, setShortcutKey] = useState({
    hasKey: false,
    createdAt: null,
    loading: true
  });
  const [generatedKey, setGeneratedKey] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  // Load shortcut key status on mount
  useEffect(() => {
    loadShortcutKeyStatus();
  }, []);

  const loadShortcutKeyStatus = async () => {
    try {
      const response = await api.get('/settings/api-key/status');
      setShortcutKey({
        hasKey: response.hasApiKey,
        createdAt: response.createdAt,
        loading: false
      });
    } catch {
      setShortcutKey(prev => ({ ...prev, loading: false }));
    }
  };

  const handleGenerateShortcutKey = async () => {
    setGeneratingKey(true);
    try {
      const response = await api.post('/settings/api-key/generate');
      setGeneratedKey(response.apiKey);
      setShortcutKey({
        hasKey: true,
        createdAt: response.createdAt,
        loading: false
      });
      toast.success('Shortcut Key generiert!');
    } catch (err) {
      toast.error('Fehler beim Generieren des Keys');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleDeleteShortcutKey = async () => {
    try {
      await api.delete('/settings/api-key');
      setShortcutKey({
        hasKey: false,
        createdAt: null,
        loading: false
      });
      setGeneratedKey(null);
      setShowDeleteConfirm(false);
      toast.success('Shortcut Key widerrufen');
    } catch (err) {
      toast.error('Fehler beim Widerrufen');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('In Zwischenablage kopiert!');
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving({ ...saving, profile: true });
    try {
      await updateSettings({ name: profileForm.name });
    } finally {
      setSaving({ ...saving, profile: false });
    }
  };

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    setSaving({ ...saving, apiKey: true });
    try {
      const currentSettings = user?.settings || {};
      await updateSettings({
        settings: {
          ...currentSettings,
          openaiApiKey: apiKeyForm.openaiApiKey,
          openaiModel: apiKeyForm.openaiModel || null
        }
      });
      toast.success('KI-Einstellungen gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving({ ...saving, apiKey: false });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    setSaving({ ...saving, password: true });
    try {
      await updateSettings({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } finally {
      setSaving({ ...saving, password: false });
    }
  };

  const handleAddCalendar = async (e) => {
    e.preventDefault();
    if (!calendarForm.calendar_url) {
      toast.error('Kalender-URL ist erforderlich');
      return;
    }
    setSaving({ ...saving, calendar: true });
    try {
      await addConnection(calendarForm);
      setCalendarForm({ provider: 'icloud', calendar_url: '', username: '', password: '' });
    } finally {
      setSaving({ ...saving, calendar: false });
    }
  };

  const handleSyncCalendar = async () => {
    try {
      const response = await api.post('/calendar/sync');
      toast.success(response.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Einstellungen</h1>
        <p className="text-text-secondary">Verwalte dein Profil und deine Präferenzen</p>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Profil</h2>
              <p className="text-sm text-text-secondary">Deine persönlichen Daten</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="input"
                placeholder="Dein Name"
              />
            </div>
            <div>
              <label className="label">E-Mail</label>
              <input
                type="email"
                value={profileForm.email}
                disabled
                className="input opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-text-secondary mt-1">E-Mail kann nicht geändert werden</p>
            </div>
            <button
              type="submit"
              disabled={saving.profile}
              className="btn btn-primary"
            >
              {saving.profile ? 'Speichere...' : 'Speichern'}
            </button>
          </form>
        </div>

        {/* OpenAI API Key Section */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">KI-Assistent</h2>
              <p className="text-sm text-text-secondary">Konfiguriere deinen OpenAI API-Zugang</p>
            </div>
          </div>

          <form onSubmit={handleSaveApiKey} className="space-y-4">
            <div>
              <label className="label">OpenAI API-Key (optional)</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyForm.openaiApiKey}
                  onChange={(e) => setApiKeyForm({ ...apiKeyForm, openaiApiKey: e.target.value })}
                  className="input pr-10"
                  placeholder="sk-... (leer lassen für Standard)"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Optional: Eigener API-Key von{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
            </div>

            <div>
              <label className="label">KI-Modell</label>
              <select
                value={hasOwnApiKey ? (apiKeyForm.openaiModel || 'gpt-4o-mini') : 'gpt-4o-mini'}
                onChange={(e) => setApiKeyForm({ ...apiKeyForm, openaiModel: e.target.value })}
                className={cn('input', !hasOwnApiKey && 'opacity-50 cursor-not-allowed')}
                disabled={!hasOwnApiKey}
              >
                {availableModels.map((model) => (
                  <option
                    key={model.id}
                    value={model.id}
                    disabled={!hasOwnApiKey && model.tier === 'pro'}
                  >
                    {model.name} {model.tier === 'pro' && !hasOwnApiKey ? '(Pro)' : ''}
                  </option>
                ))}
              </select>
              {!hasOwnApiKey ? (
                <p className="text-xs text-text-secondary mt-1">
                  GPT-4o Mini wird kostenlos verwendet. Eigenen API-Key eingeben um andere Modelle zu wählen.
                </p>
              ) : (
                <p className="text-xs text-text-secondary mt-1">
                  {availableModels.find(m => m.id === (apiKeyForm.openaiModel || 'gpt-4o-mini'))?.description}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving.apiKey}
              className="btn btn-primary"
            >
              {saving.apiKey ? 'Speichere...' : 'Speichern'}
            </button>
          </form>
        </div>

        {/* Kurzbefehle & Externe Apps Section */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Kurzbefehle & Externe Apps</h2>
              <p className="text-sm text-text-secondary">Verbinde iOS-Kurzbefehle mit deinem Second Brain</p>
            </div>
          </div>

          {shortcutKey.loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Generated Key Display (only shown once after generation) */}
              {generatedKey && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary mb-2">
                        Dein neuer Shortcut Key (nur einmalig sichtbar!)
                      </p>
                      <div className="flex items-center gap-2 p-2 bg-surface-secondary rounded font-mono text-sm break-all">
                        <code className="flex-1">{generatedKey}</code>
                        <button
                          onClick={() => copyToClipboard(generatedKey)}
                          className="p-1.5 hover:bg-surface-primary rounded transition-colors"
                          title="Kopieren"
                        >
                          <Copy className="w-4 h-4 text-accent" />
                        </button>
                      </div>
                      <p className="text-xs text-text-secondary mt-2">
                        Speichere diesen Key sicher! Er wird nicht erneut angezeigt.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Status */}
              {shortcutKey.hasKey ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary">Shortcut Key aktiv</p>
                      <p className="text-xs text-text-secondary">
                        Erstellt am {new Date(shortcutKey.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleGenerateShortcutKey}
                        disabled={generatingKey}
                        className="btn btn-secondary text-sm"
                      >
                        {generatingKey ? 'Generiere...' : 'Neu generieren'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Key widerrufen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Delete Confirmation Dialog */}
                  {showDeleteConfirm && (
                    <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-error mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-text-primary mb-2">
                            Shortcut Key wirklich widerrufen?
                          </p>
                          <p className="text-sm text-text-secondary mb-3">
                            Deine Kurzbefehle werden nicht mehr funktionieren.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleDeleteShortcutKey}
                              className="btn bg-error text-white hover:bg-error/90"
                            >
                              Widerrufen
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              className="btn btn-secondary"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary">
                    Generiere einen Shortcut Key, um Notizen, Aufgaben und Bilder direkt von
                    iOS-Kurzbefehlen, Siri oder dem Teilen-Button zu erfassen.
                  </p>
                  <button
                    onClick={handleGenerateShortcutKey}
                    disabled={generatingKey}
                    className="btn btn-primary"
                  >
                    {generatingKey ? 'Generiere...' : 'Shortcut Key generieren'}
                  </button>
                </div>
              )}

              {/* Kurzbefehl Setup Instructions */}
              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="font-medium text-text-primary mb-3">Kurzbefehl einrichten</h3>
                <div className="space-y-3 text-sm text-text-secondary">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">1</span>
                    <p>Generiere oben einen Shortcut Key und kopiere ihn</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">2</span>
                    <div>
                      <p>Lade den Kurzbefehl herunter:</p>
                      <a
                        href="https://www.icloud.com/shortcuts/32bbb0645e6f4046b9fa93bc5500a759"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline mt-1"
                      >
                        Second Brain Quick Capture
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">3</span>
                    <p>Bearbeite den Kurzbefehl in der Kurzbefehle-App und trage deinen Shortcut Key ein</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-surface-secondary rounded-lg text-xs text-text-secondary">
                  <p className="font-medium text-text-primary mb-1">Tipp:</p>
                  <p>Füge den Kurzbefehl zum Home-Bildschirm hinzu oder aktiviere ihn per Siri. Du kannst auch jedes Foto über den Teilen-Button direkt an den Pocket Assistent senden – zusammen mit einer Textanfrage.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Passwort ändern</h2>
              <p className="text-sm text-text-secondary">Aktualisiere dein Passwort</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Aktuelles Passwort</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Neues Passwort</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Passwort bestätigen</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="input"
              />
            </div>
            <button
              type="submit"
              disabled={saving.password || !passwordForm.currentPassword || !passwordForm.newPassword}
              className="btn btn-primary"
            >
              {saving.password ? 'Ändere...' : 'Passwort ändern'}
            </button>
          </form>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Erscheinungsbild</h2>
              <p className="text-sm text-text-secondary">Wähle dein bevorzugtes Theme und Akzentfarbe</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">Darstellung</label>
              <div className="flex gap-4">
                <button
                  onClick={setLightTheme}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    theme === 'light'
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="w-full h-20 rounded-md bg-white border border-gray-200 mb-2" />
                  <p className="text-sm font-medium text-text-primary">Hell</p>
                </button>
                <button
                  onClick={setDarkTheme}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="w-full h-20 rounded-md bg-gray-900 border border-gray-700 mb-2" />
                  <p className="text-sm font-medium text-text-primary">Dunkel</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">Akzentfarbe</label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setAccentColor(color.id)}
                    className={cn(
                      'relative aspect-square rounded-xl border-2 transition-all flex items-center justify-center',
                      accentColor === color.id
                        ? 'border-text-primary scale-105 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{
                      backgroundColor: theme === 'dark' ? color.darkColor : color.color
                    }}
                    title={color.name}
                  >
                    {accentColor === color.id && (
                      <Check className="w-5 h-5 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Aktuelle Farbe: {accentColors.find(c => c.id === accentColor)?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-text-primary">Kalender-Integration</h2>
                <p className="text-sm text-text-secondary">Verbinde externe Kalender via CalDAV</p>
              </div>
            </div>
            <button
              onClick={handleSyncCalendar}
              className="btn btn-secondary"
            >
              <RefreshCw className="w-4 h-4" />
              Synchronisieren
            </button>
          </div>

          {connections.length > 0 && (
            <div className="mb-6 space-y-2">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                >
                  <div>
                    <p className="font-medium text-text-primary capitalize">{conn.provider}</p>
                    <p className="text-xs text-text-secondary truncate max-w-xs">
                      {conn.calendar_url}
                    </p>
                  </div>
                  <button
                    onClick={() => removeConnection(conn.id)}
                    className="text-sm text-error hover:underline"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddCalendar} className="space-y-4">
            <div>
              <label className="label">Anbieter</label>
              <select
                value={calendarForm.provider}
                onChange={(e) => setCalendarForm({ ...calendarForm, provider: e.target.value })}
                className="input"
              >
                <option value="icloud">iCloud</option>
                <option value="outlook">Outlook</option>
              </select>
            </div>
            <div>
              <label className="label">CalDAV-URL</label>
              <input
                type="url"
                value={calendarForm.calendar_url}
                onChange={(e) => setCalendarForm({ ...calendarForm, calendar_url: e.target.value })}
                className="input"
                placeholder="https://caldav.icloud.com/..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Benutzername</label>
                <input
                  type="text"
                  value={calendarForm.username}
                  onChange={(e) => setCalendarForm({ ...calendarForm, username: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Passwort / App-Passwort</label>
                <input
                  type="password"
                  value={calendarForm.password}
                  onChange={(e) => setCalendarForm({ ...calendarForm, password: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving.calendar || !calendarForm.calendar_url}
              className="btn btn-primary"
            >
              {saving.calendar ? 'Verbinde...' : 'Kalender verbinden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
