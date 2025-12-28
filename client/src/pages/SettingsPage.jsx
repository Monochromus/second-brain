import { useState } from 'react';
import { User, Key, Calendar, Palette, RefreshCw, Bot, Eye, EyeOff, Check } from 'lucide-react';
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
    openaiApiKey: user?.settings?.openaiApiKey || ''
  });
  const [showApiKey, setShowApiKey] = useState(false);

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
          openaiApiKey: apiKeyForm.openaiApiKey
        }
      });
      toast.success('API-Key gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern des API-Keys');
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
              <label className="label">OpenAI API-Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyForm.openaiApiKey}
                  onChange={(e) => setApiKeyForm({ ...apiKeyForm, openaiApiKey: e.target.value })}
                  className="input pr-10"
                  placeholder="sk-..."
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
                Du benötigst einen API-Key von{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  platform.openai.com
                </a>
                {' '}um den KI-Assistenten zu nutzen.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving.apiKey}
              className="btn btn-primary"
            >
              {saving.apiKey ? 'Speichere...' : 'API-Key speichern'}
            </button>
          </form>
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
