# 🧠 Second Brain

Ein KI-gestütztes Produktivitätstool zum Verwalten von Todos, Notizen, Projekten und Kalenderterminen.

## Features

- **AI-Agent**: Natürlichsprachliche Eingabe zum Erstellen und Verwalten von Inhalten
- **Todos**: Aufgaben mit Prioritäten, Fälligkeitsdaten und Projekt-Zuordnung
- **Notizen**: Rich-Text-Editor mit Tags und Farbcodierung
- **Projekte**: Gruppiere Todos und Notizen thematisch
- **Kalender**: Integration mit iCloud/Outlook via CalDAV
- **Dark/Light Mode**: Automatische Theme-Erkennung

## Tech-Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- shadcn/ui-Style Komponenten
- @tiptap/react für Rich-Text-Editor
- @dnd-kit für Drag & Drop
- lucide-react für Icons

### Backend
- Node.js + Express
- better-sqlite3 für SQLite
- express-session für Auth
- OpenAI API für AI-Agent
- tsdav für CalDAV

## Installation

### Voraussetzungen
- Node.js 18+
- npm oder yarn
- OpenAI API Key

### Setup

1. **Repository klonen**
```bash
git clone <repository-url>
cd second-brain
```

2. **Abhängigkeiten installieren**
```bash
npm run install:all
```

3. **Umgebungsvariablen konfigurieren**
```bash
cp .env.example .env
```

Bearbeite `.env` und füge deinen OpenAI API Key ein:
```env
OPENAI_API_KEY=sk-your-api-key-here
SESSION_SECRET=ein-sicherer-zufalls-string
```

4. **Entwicklungsserver starten**
```bash
npm run dev
```

Die App läuft auf:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Produktion

```bash
npm run build
npm start
```

## Projektstruktur

```
second-brain/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # UI Komponenten
│   │   ├── context/       # React Context
│   │   ├── hooks/         # Custom Hooks
│   │   ├── lib/           # Utilities
│   │   ├── pages/         # Seiten-Komponenten
│   │   └── styles/        # CSS Dateien
│   └── public/            # Statische Assets
│
├── server/                 # Express Backend
│   ├── config/            # Datenbank-Setup
│   ├── middleware/        # Auth & Error Handling
│   ├── routes/            # API Routes
│   ├── services/          # OpenAI, CalDAV
│   └── utils/             # Hilfsfunktionen
│
└── data/                   # SQLite Datenbank
```

## API Endpunkte

### Auth
- `POST /api/auth/register` - Registrierung
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Aktueller User
- `PUT /api/auth/settings` - Einstellungen

### Todos
- `GET /api/todos` - Alle Todos
- `POST /api/todos` - Neues Todo
- `PUT /api/todos/:id` - Todo aktualisieren
- `PUT /api/todos/:id/complete` - Todo abhaken
- `DELETE /api/todos/:id` - Todo löschen

### Notizen
- `GET /api/notes` - Alle Notizen
- `POST /api/notes` - Neue Notiz
- `PUT /api/notes/:id` - Notiz aktualisieren
- `PUT /api/notes/:id/pin` - Notiz anheften
- `DELETE /api/notes/:id` - Notiz löschen

### Projekte
- `GET /api/projects` - Alle Projekte
- `GET /api/projects/:id` - Projekt-Details
- `POST /api/projects` - Neues Projekt
- `PUT /api/projects/:id` - Projekt aktualisieren
- `DELETE /api/projects/:id` - Projekt löschen

### Kalender
- `GET /api/calendar/events` - Termine
- `POST /api/calendar/events` - Neuer Termin
- `PUT /api/calendar/events/:id` - Termin aktualisieren
- `DELETE /api/calendar/events/:id` - Termin löschen
- `POST /api/calendar/sync` - Kalender synchronisieren

### AI Agent
- `POST /api/agent/chat` - Nachricht an Agent

## AI-Agent Funktionen

Der Agent kann:
- Todos erstellen, bearbeiten, löschen, abhaken
- Notizen erstellen und durchsuchen
- Projekte erstellen und verwalten
- Kalendertermine abrufen und erstellen
- Items miteinander verknüpfen

**Beispiele:**
- "Erstelle ein Todo für morgen: Präsentation vorbereiten"
- "Was steht heute an?"
- "Zeige meine offenen Aufgaben mit hoher Priorität"
- "Erstelle eine Notiz mit dem Titel 'Meeting-Protokoll'"
- "Lege ein neues Projekt 'Website Relaunch' an"

## Kalender-Integration

### iCloud
1. Gehe zu https://www.icloud.com/settings/
2. Erstelle ein App-spezifisches Passwort
3. In Einstellungen: CalDAV URL + Credentials eingeben

### Outlook
1. CalDAV URL: `https://outlook.office365.com/caldav/`
2. Verwende deine Microsoft-Anmeldedaten

## Lizenz

MIT
