/**
 * Email Provider Configuration
 *
 * Contains IMAP and SMTP settings for supported email providers.
 * Initially only iCloud is fully supported.
 */

const EMAIL_PROVIDERS = {
  icloud: {
    name: 'iCloud',
    imap: {
      host: 'imap.mail.me.com',
      port: 993,
      tls: true
    },
    smtp: {
      host: 'smtp.mail.me.com',
      port: 587,
      secure: false,
      requireTLS: true
    },
    helpUrl: 'https://appleid.apple.com/account/manage',
    helpText: 'Erstelle ein App-spezifisches Passwort unter appleid.apple.com → Sicherheit → App-spezifische Passwörter'
  },
  gmail: {
    name: 'Gmail',
    imap: {
      host: 'imap.gmail.com',
      port: 993,
      tls: true
    },
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true
    },
    helpUrl: 'https://myaccount.google.com/apppasswords',
    helpText: 'Erstelle ein App-Passwort unter myaccount.google.com → Sicherheit → 2-Faktor-Authentifizierung → App-Passwörter'
  },
  outlook: {
    name: 'Outlook',
    imap: {
      host: 'outlook.office365.com',
      port: 993,
      tls: true
    },
    smtp: {
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      requireTLS: true
    },
    helpUrl: 'https://account.microsoft.com/security',
    helpText: 'Für Outlook/Hotmail-Konten kann das normale Passwort verwendet werden, wenn IMAP aktiviert ist'
  },
  gmx: {
    name: 'GMX',
    imap: {
      host: 'imap.gmx.net',
      port: 993,
      tls: true
    },
    smtp: {
      host: 'mail.gmx.net',
      port: 587,
      secure: false,
      requireTLS: true
    },
    helpUrl: 'https://www.gmx.net/mail/imap-pop3/',
    helpText: 'Aktiviere IMAP in den GMX-Einstellungen. Verwende dein normales GMX-Passwort.'
  }
};

/**
 * Get provider configuration by name
 * @param {string} providerName - The provider name (icloud, gmail, outlook)
 * @returns {object|null} - Provider configuration or null if not found
 */
function getProvider(providerName) {
  return EMAIL_PROVIDERS[providerName.toLowerCase()] || null;
}

/**
 * Get list of all available providers for UI
 * @returns {Array<{id: string, name: string, helpUrl: string, helpText: string}>}
 */
function getProviderList() {
  return Object.entries(EMAIL_PROVIDERS).map(([id, config]) => ({
    id,
    name: config.name,
    helpUrl: config.helpUrl,
    helpText: config.helpText
  }));
}

/**
 * Check if a provider is supported
 * @param {string} providerName - The provider name
 * @returns {boolean}
 */
function isValidProvider(providerName) {
  return providerName.toLowerCase() in EMAIL_PROVIDERS;
}

module.exports = {
  EMAIL_PROVIDERS,
  getProvider,
  getProviderList,
  isValidProvider
};
