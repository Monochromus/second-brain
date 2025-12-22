import { useState } from 'react';
import { User, Key, Calendar, Palette, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useCalendarConnections } from '../hooks/useCalendar';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateSettings } = useAuth();
  const { theme, setLightTheme, setDarkTheme } = useTheme();
  const { connections, addConnection, removeConnection, refetch: refetchConnections } = useCalendarConnections();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

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
              <p className="text-sm text-text-secondary">Wähle dein bevorzugtes Theme</p>
            </div>
          </div>

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
