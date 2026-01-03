import { useState, useEffect } from 'react';
import { User, Key, Calendar, Palette, RefreshCw, Bot, Eye, EyeOff, Check, Smartphone, Copy, Trash2, AlertTriangle, ExternalLink, Globe, Mail, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useCalendarConnections } from '../hooks/useCalendar';
import { useEmailAccounts } from '../hooks/useEmailAccounts';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { user, updateSettings } = useAuth();
  const { theme, setLightTheme, setDarkTheme, accentColor, setAccentColor, accentColors } = useTheme();
  const { connections, addConnection, removeConnection, refetch: refetchConnections } = useCalendarConnections();
  const {
    accounts: emailAccounts,
    providers: emailProviders,
    loading: emailAccountsLoading,
    addAccount: addEmailAccount,
    removeAccount: removeEmailAccount,
    testConnection: testEmailConnection,
    syncAccount: syncEmailAccount
  } = useEmailAccounts();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [apiKeyForm, setApiKeyForm] = useState({
    openaiApiKey: user?.settings?.openaiApiKey || '',
    openaiModel: user?.settings?.openaiModel || ''
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const [perplexityForm, setPerplexityForm] = useState({
    apiKey: user?.settings?.perplexityApiKey || '',
    model: user?.settings?.perplexityModel || 'sonar'
  });
  const [showPerplexityKey, setShowPerplexityKey] = useState(false);

  const perplexityModels = [
    { id: 'sonar', name: 'Sonar', description: 'Standard, schnell', tier: 'free' },
    { id: 'sonar-pro', name: 'Sonar Pro', description: 'Genauer, mehr Quellen', tier: 'pro' },
    { id: 'sonar-reasoning', name: 'Sonar Reasoning', description: 'Für komplexe Fragen', tier: 'pro' },
    { id: 'sonar-deep-research', name: 'Deep Research', description: 'Tiefgehende Analyse', tier: 'pro' }
  ];

  const hasOwnPerplexityKey = Boolean(perplexityForm.apiKey?.trim());

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

  const [emailForm, setEmailForm] = useState({
    email: '',
    password: '',
    display_name: '',
    provider: 'icloud',
    color: '#3B82F6'
  });
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [testingEmail, setTestingEmail] = useState(null);
  const [syncingEmail, setSyncingEmail] = useState(null);
  const [showAddEmailForm, setShowAddEmailForm] = useState(false);

  const [saving, setSaving] = useState({
    profile: false,
    apiKey: false,
    perplexity: false,
    password: false,
    calendar: false,
    email: false
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

  const handleSavePerplexity = async (e) => {
    e.preventDefault();
    setSaving({ ...saving, perplexity: true });
    try {
      const currentSettings = user?.settings || {};
      await updateSettings({
        settings: {
          ...currentSettings,
          perplexityApiKey: perplexityForm.apiKey,
          perplexityModel: perplexityForm.model || 'sonar'
        }
      });
      toast.success('Web-Recherche Einstellungen gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving({ ...saving, perplexity: false });
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

  const handleAddEmailAccount = async (e) => {
    e.preventDefault();
    if (!emailForm.email || !emailForm.password) {
      toast.error('E-Mail und Passwort sind erforderlich');
      return;
    }
    setSaving({ ...saving, email: true });
    try {
      await addEmailAccount(emailForm);
      setEmailForm({
        email: '',
        password: '',
        display_name: '',
        provider: 'icloud',
        color: '#3B82F6'
      });
      setShowAddEmailForm(false);
    } catch {
      // Error already handled by hook
    } finally {
      setSaving({ ...saving, email: false });
    }
  };

  const handleTestEmailConnection = async (accountId) => {
    setTestingEmail(accountId);
    try {
      await testEmailConnection(accountId);
    } catch {
      // Error already handled by hook
    } finally {
      setTestingEmail(null);
    }
  };

  const handleSyncEmailAccount = async (accountId) => {
    setSyncingEmail(accountId);
    try {
      await syncEmailAccount(accountId);
    } catch {
      // Error already handled by hook
    } finally {
      setSyncingEmail(null);
    }
  };

  const emailColors = [
    { id: '#3B82F6', name: 'Blau' },
    { id: '#10B981', name: 'Grün' },
    { id: '#8B5CF6', name: 'Violett' },
    { id: '#F59E0B', name: 'Orange' },
    { id: '#EF4444', name: 'Rot' },
    { id: '#EC4899', name: 'Pink' }
  ];

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

        {/* Perplexity Web Research Section */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Web-Recherche</h2>
              <p className="text-sm text-text-secondary">Perplexity AI für aktuelle Web-Suchen</p>
            </div>
          </div>

          <form onSubmit={handleSavePerplexity} className="space-y-4">
            <div>
              <label className="label">Perplexity API-Key (optional)</label>
              <div className="relative">
                <input
                  type={showPerplexityKey ? 'text' : 'password'}
                  value={perplexityForm.apiKey}
                  onChange={(e) => setPerplexityForm({ ...perplexityForm, apiKey: e.target.value })}
                  className="input pr-10"
                  placeholder="pplx-... (leer lassen für Standard)"
                />
                <button
                  type="button"
                  onClick={() => setShowPerplexityKey(!showPerplexityKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showPerplexityKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                API-Key von{' '}
                <a
                  href="https://www.perplexity.ai/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  perplexity.ai/settings/api
                </a>
                {' '}- ermöglicht dem Assistenten, aktuelle Informationen aus dem Web zu recherchieren
              </p>
            </div>

            <div>
              <label className="label">Recherche-Modell</label>
              <select
                value={hasOwnPerplexityKey ? (perplexityForm.model || 'sonar') : 'sonar'}
                onChange={(e) => setPerplexityForm({ ...perplexityForm, model: e.target.value })}
                className={cn('input', !hasOwnPerplexityKey && 'opacity-50 cursor-not-allowed')}
                disabled={!hasOwnPerplexityKey}
              >
                {perplexityModels.map((model) => (
                  <option
                    key={model.id}
                    value={model.id}
                    disabled={!hasOwnPerplexityKey && model.tier === 'pro'}
                  >
                    {model.name} - {model.description} {model.tier === 'pro' && !hasOwnPerplexityKey ? '(Pro)' : ''}
                  </option>
                ))}
              </select>
              {!hasOwnPerplexityKey ? (
                <p className="text-xs text-text-secondary mt-1">
                  Sonar wird kostenlos verwendet. Eigenen API-Key eingeben um andere Modelle zu wählen.
                </p>
              ) : (
                <p className="text-xs text-text-secondary mt-1">
                  {perplexityModels.find(m => m.id === (perplexityForm.model || 'sonar'))?.description}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving.perplexity}
              className="btn btn-primary"
            >
              {saving.perplexity ? 'Speichere...' : 'Speichern'}
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

        {/* Email Accounts Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-text-primary">E-Mail-Konten</h2>
                <p className="text-sm text-text-secondary">Verbinde E-Mail-Accounts für den Assistenten</p>
              </div>
            </div>
            {!showAddEmailForm && (
              <button
                onClick={() => setShowAddEmailForm(true)}
                className="btn btn-secondary"
              >
                <Plus className="w-4 h-4" />
                Hinzufügen
              </button>
            )}
          </div>

          {emailAccountsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : (
            <>
              {/* Existing Email Accounts */}
              {emailAccounts.length > 0 && (
                <div className="mb-6 space-y-3">
                  {emailAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: account.color || '#3B82F6' }}
                        />
                        <div>
                          <p className="font-medium text-text-primary">
                            {account.display_name || account.email}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {account.email} • {account.provider}
                            {account.last_sync && (
                              <> • Letzte Sync: {new Date(account.last_sync).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</>
                            )}
                          </p>
                          {account.sync_error && (
                            <p className="text-xs text-error mt-1">{account.sync_error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTestEmailConnection(account.id)}
                          disabled={testingEmail === account.id}
                          className="btn btn-secondary text-xs px-2 py-1"
                          title="Verbindung testen"
                        >
                          {testingEmail === account.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleSyncEmailAccount(account.id)}
                          disabled={syncingEmail === account.id}
                          className="btn btn-secondary text-xs px-2 py-1"
                          title="Jetzt synchronisieren"
                        >
                          {syncingEmail === account.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => removeEmailAccount(account.id)}
                          className="p-1.5 text-error hover:bg-error/10 rounded transition-colors"
                          title="Account entfernen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Email Account Form */}
              {showAddEmailForm && (
                <form onSubmit={handleAddEmailAccount} className="space-y-4 p-4 bg-surface-secondary rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-text-primary">Neuen Account hinzufügen</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddEmailForm(false)}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="label">E-Mail-Adresse</label>
                    <input
                      type="email"
                      value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                      className="input"
                      placeholder="deine@email.de"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">App-spezifisches Passwort</label>
                    <div className="relative">
                      <input
                        type={showEmailPassword ? 'text' : 'password'}
                        value={emailForm.password}
                        onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                        className="input pr-10"
                        placeholder="xxxx-xxxx-xxxx-xxxx"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailPassword(!showEmailPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      >
                        {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      {emailForm.provider === 'icloud' && (
                        <>Erstelle ein App-spezifisches Passwort unter{' '}
                          <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">appleid.apple.com</a>
                        </>
                      )}
                      {emailForm.provider === 'gmail' && (
                        <>Erstelle ein App-Passwort unter{' '}
                          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">myaccount.google.com</a>
                          {' '}(2FA muss aktiviert sein)
                        </>
                      )}
                      {emailForm.provider === 'outlook' && (
                        <>Verwende dein normales Microsoft-Passwort. IMAP muss in den Outlook-Einstellungen aktiviert sein.</>
                      )}
                      {emailForm.provider === 'gmx' && (
                        <>Aktiviere IMAP in den{' '}
                          <a href="https://www.gmx.net/mail/imap-pop3/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GMX-Einstellungen</a>
                          . Verwende dein normales GMX-Passwort.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Anzeigename (optional)</label>
                      <input
                        type="text"
                        value={emailForm.display_name}
                        onChange={(e) => setEmailForm({ ...emailForm, display_name: e.target.value })}
                        className="input"
                        placeholder="Privat"
                      />
                    </div>
                    <div>
                      <label className="label">Anbieter</label>
                      <select
                        value={emailForm.provider}
                        onChange={(e) => setEmailForm({ ...emailForm, provider: e.target.value })}
                        className="input"
                      >
                        <option value="icloud">iCloud</option>
                        <option value="gmail">Gmail</option>
                        <option value="outlook">Outlook</option>
                        <option value="gmx">GMX</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">Farbe</label>
                    <div className="flex gap-2">
                      {emailColors.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setEmailForm({ ...emailForm, color: color.id })}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
                            emailForm.color === color.id
                              ? 'border-text-primary scale-110'
                              : 'border-transparent hover:scale-105'
                          )}
                          style={{ backgroundColor: color.id }}
                          title={color.name}
                        >
                          {emailForm.color === color.id && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={saving.email}
                      className="btn btn-primary"
                    >
                      {saving.email ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verbinde...
                        </>
                      ) : (
                        'Account verbinden'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEmailForm(false)}
                      className="btn btn-secondary"
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
              )}

              {/* Empty State */}
              {emailAccounts.length === 0 && !showAddEmailForm && (
                <div className="text-center py-6 text-text-secondary">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Noch keine E-Mail-Konten verbunden</p>
                  <p className="text-sm mt-1">
                    Verbinde ein Konto, um E-Mails über den Assistenten zu verwalten
                  </p>
                </div>
              )}

              {/* Help Text */}
              <div className="mt-4 p-3 bg-surface-secondary rounded-lg text-xs text-text-secondary">
                <p className="font-medium text-text-primary mb-1">Hinweis:</p>
                <p>
                  Nach dem Verbinden kann der Assistent E-Mails lesen, durchsuchen und Entwürfe erstellen.
                  E-Mails werden nie automatisch gesendet – du behältst immer die Kontrolle.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
