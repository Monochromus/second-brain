const OpenAI = require('openai');
const db = require('../config/database');

// Get user's API key from settings
function getUserApiKey(userId) {
  const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId);
  if (user && user.settings) {
    try {
      const settings = JSON.parse(user.settings);
      return settings.openaiApiKey || null;
    } catch {
      return null;
    }
  }
  return null;
}

// Get user's preferred model from settings
function getUserModel(userId) {
  const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId);
  if (user && user.settings) {
    try {
      const settings = JSON.parse(user.settings);
      return settings.openaiModel || null;
    } catch {
      return null;
    }
  }
  return null;
}

// Create OpenAI client with user's API key or fallback to environment variable
function createOpenAIClient(userId) {
  const userApiKey = getUserApiKey(userId);
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
    return null;
  }

  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `Du bist der AI-Assistent im "Pocket Assistent" Produktivitätstool.
Du hilfst dem Nutzer, Aufgaben zu organisieren, Termine zu verwalten, Notizen zu erstellen und Recherchen zu betreiben.

PARA-SYSTEM (Tiago Forte):
Das PARA-System ist die Grundstruktur dieses Produktivitätstools. Halte dich STRIKT an diese Regeln:

1. AREAS (Verantwortungsbereiche):
   - Langfristige Verantwortungen OHNE Deadline (z.B. "Gesundheit", "Karriere", "Familie")
   - Areas enthalten: Projekte und Notizen
   - Areas haben KEINE direkten Todos (Todos gehören zu Projekten)
   - Areas haben KEINE Ressourcen (Ressourcen sind thematisch, nicht Verantwortungen)

2. PROJECTS (Projekte):
   - Kurzfristige Vorhaben MIT Ziel und optionaler Deadline
   - Jedes Projekt gehört zu EINER Area
   - Projekte enthalten: Todos, Notizen, verknüpfte Ressourcen
   - Bei Projekterstellung: IMMER erst list_areas aufrufen und passende Area zuordnen

3. RESOURCES (Ressourcen/Wissensspeicher):
   - Thematische Sammlungen und Referenzmaterial (z.B. "Rezepte", "Programmierung")
   - Ressourcen können mit MEHREREN Projekten verknüpft sein
   - Ressourcen haben KEINE Area-Zuordnung
   - Ressourcen können Notizen enthalten

4. TODOS (Aufgaben):
   - Todos gehören IMMER zu einem Projekt
   - Bei Todo-Erstellung: IMMER project_id angeben wenn möglich

5. NOTES (Notizen):
   - Eine Notiz gehört zu GENAU EINEM Container: Projekt ODER Area ODER Ressource
   - NIE mehrere Container gleichzeitig

Deine Fähigkeiten:
- Todos erstellen (immer mit project_id), bearbeiten, priorisieren, abschließen, löschen
- Notizen erstellen (mit project_id ODER area_id ODER resource_id), bearbeiten und durchsuchen
- Projekte erstellen (immer mit area_id) und verwalten
- Ressourcen erstellen und mit Projekten verknüpfen
- Kalendertermine abrufen, erstellen, bearbeiten und löschen
- Areas verwalten
- Custom Tools erstellen, anpassen und löschen (interaktive Mini-Apps wie Timer, Uhren, Rechner, Kanban-Boards)
- E-Mails durchsuchen, lesen und zusammenfassen
- E-Mail-Entwürfe für Antworten und neue Nachrichten erstellen

CUSTOM TOOLS REGELN:
- Wenn der Nutzer ein Custom Tool wünscht (z.B. "Erstelle mir einen Timer", "Ich brauche eine Weltuhr"):
  1. Formuliere eine detaillierte Beschreibung basierend auf den Wünschen des Nutzers
  2. Nutze create_custom_tool mit dieser Beschreibung
- Maximal 3 Custom Tools sind erlaubt
- Beispiel: Nutzer sagt "Ich brauche einen Pomodoro Timer" → Du erstellst: "Ein Pomodoro-Timer mit 25 Minuten Arbeitszeit und 5 Minuten Pause, Start/Stop/Reset-Buttons, visuelle Fortschrittsanzeige und akustischem Signal bei Ablauf"

E-MAIL-REGELN:
- Du kannst E-Mails durchsuchen (search_emails), lesen (get_email_content) und Threads anzeigen (get_email_thread)
- Du kannst E-Mail-Entwürfe erstellen mit draft_email_reply oder draft_new_email
- E-Mails werden nie automatisch gesendet
- Entwürfe werden dem Nutzer zur Überprüfung und manuellen Bestätigung angezeigt
- Der Nutzer entscheidet ob er senden, bearbeiten oder verwerfen möchte
- Sensible E-Mail-Inhalte (Passwörter, Finanzdaten) werden gefiltert und nicht im Kontext gespeichert

KALENDER-REGELN (DAUER SCHÄTZEN):
- Wenn der Nutzer KEINE Endzeit oder Dauer angibt, schätze eine sinnvolle Dauer basierend auf dem Termintyp:
  * Schule, Unterricht: 6-8 Stunden (z.B. 8-14 Uhr oder 8-16 Uhr)
  * Uni, Vorlesung, Studium: 2-4 Stunden
  * Arbeit, Büro, Schicht: 8 Stunden
  * Arzttermin, Zahnarzt: 1 Stunde
  * Meeting, Besprechung, Call: 1 Stunde
  * Mittagessen, Lunch: 1 Stunde
  * Abendessen, Dinner: 2 Stunden
  * Kaffee, Coffee: 30 Minuten
  * Telefonat, Anruf: 30 Minuten
  * Training, Sport, Gym: 1.5 Stunden
  * Friseur: 1 Stunde
  * Konzert, Theater, Kino: 2-3 Stunden
  * Party, Feier: 4 Stunden
  * Flug: basierend auf Strecke
  * Workshop, Seminar: 3 Stunden
  * Unbekannt/Standard: 1 Stunde
- WICHTIG: Denke logisch! "Schule ab 8" = ca. 6h, "Arbeit ab 9" = ca. 8h
- Gib immer BEIDE Zeiten an (start_time und end_time)

WICHTIGE ANTWORT-REGELN:
- Antworte IMMER sehr kurz und prägnant (1-2 Sätze maximal)
- KEINE Links oder URLs in deinen Antworten - die werden separat angezeigt
- KEINE Listen, Aufzählungen oder formatierte Texte
- Nach web_research: Antworte NUR mit einem SEHR kurzen Satz (max 10 Wörter)

KRITISCH - TOOL-NUTZUNG:
- NIEMALS behaupten etwas getan zu haben ohne das entsprechende Tool aufzurufen!
- Wenn du "erstellt", "hinzugefügt", "geändert" sagst, MUSS ein Tool-Aufruf erfolgt sein
- Bei Aktionsanfragen: IMMER zuerst Tool aufrufen, DANN bestätigen

Weitere Regeln:
1. Führe Aktionen direkt aus, frage nur bei echten Unklarheiten nach
2. PARA-Verknüpfungen: IMMER zuerst list_areas/list_projects aufrufen um passende Container zu finden
3. Bei Zeitangaben wie "morgen", "nächste Woche" berechne das korrekte Datum
4. Antworte immer auf Deutsch
5. Nutze web_research wenn der Nutzer nach aktuellen Informationen fragt
6. WICHTIG: Führe maximal 1-2 web_research Aufrufe pro Nutzeranfrage durch

Heute ist ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

const tools = [
  {
    type: "function",
    function: {
      name: "create_todo",
      description: "Erstellt ein neues Todo/eine neue Aufgabe. PARA: Todos gehören IMMER zu einem Projekt, nie direkt zu einer Area.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titel des Todos" },
          description: { type: "string", description: "Optionale Beschreibung" },
          priority: { type: "integer", minimum: 1, maximum: 5, description: "1=höchste, 5=niedrigste Priorität. Standard ist 3." },
          due_date: { type: "string", description: "Fälligkeitsdatum im Format YYYY-MM-DD" },
          due_time: { type: "string", description: "Uhrzeit im Format HH:MM" },
          project_id: { type: "integer", description: "ID des Projekts, dem das Todo zugeordnet werden soll. WICHTIG: Immer angeben wenn möglich!" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_todo",
      description: "Aktualisiert ein bestehendes Todo",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID des Todos" },
          title: { type: "string", description: "Neuer Titel" },
          description: { type: "string", description: "Neue Beschreibung" },
          priority: { type: "integer", minimum: 1, maximum: 5 },
          status: { type: "string", enum: ["open", "in_progress", "done", "cancelled"] },
          due_date: { type: "string", description: "Format YYYY-MM-DD" },
          due_time: { type: "string", description: "Format HH:MM" },
          project_id: { type: "integer", description: "Projekt-ID oder null zum Entfernen" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_todo",
      description: "Markiert ein Todo als erledigt oder öffnet es wieder",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID des Todos" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_todos",
      description: "Listet Todos auf, optional gefiltert",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "in_progress", "done", "all"], description: "Filter nach Status" },
          project_id: { type: "integer", description: "Filter nach Projekt" },
          priority: { type: "integer", description: "Filter nach Priorität" },
          due_before: { type: "string", description: "Todos die vor diesem Datum fällig sind (YYYY-MM-DD)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_todo",
      description: "Löscht ein Todo dauerhaft",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID des zu löschenden Todos" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Erstellt eine neue Notiz. PARA: Eine Notiz gehört zu GENAU EINEM Container (Projekt ODER Area ODER Ressource).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titel der Notiz" },
          content: { type: "string", description: "Inhalt der Notiz (kann Markdown sein)" },
          tags: { type: "array", items: { type: "string" }, description: "Tags für die Notiz" },
          project_id: { type: "integer", description: "Projekt-ID für Zuordnung (exklusiv mit area_id und resource_id)" },
          area_id: { type: "integer", description: "Area-ID für Zuordnung (exklusiv mit project_id und resource_id)" },
          resource_id: { type: "integer", description: "Ressource-ID für Zuordnung (exklusiv mit project_id und area_id)" },
          color: { type: "string", description: "Hex-Farbcode für die Notiz-Karte, z.B. #FEF3C7" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_note",
      description: "Aktualisiert eine bestehende Notiz. PARA: Nur EINEN Container zuweisen.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID der Notiz" },
          title: { type: "string" },
          content: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          project_id: { type: "integer", description: "Projekt-ID (setzt area_id und resource_id auf null)" },
          area_id: { type: "integer", description: "Area-ID (setzt project_id und resource_id auf null)" },
          resource_id: { type: "integer", description: "Ressource-ID (setzt project_id und area_id auf null)" },
          color: { type: "string" },
          is_pinned: { type: "boolean", description: "Notiz anheften" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_notes",
      description: "Durchsucht Notizen nach Inhalt oder Tags",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Suchbegriff" },
          tags: { type: "array", items: { type: "string" }, description: "Filtern nach Tags" },
          project_id: { type: "integer", description: "Filtern nach Projekt" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_note",
      description: "Löscht eine Notiz",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID der zu löschenden Notiz" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Erstellt ein neues Projekt. Projekte sollten einer Area zugeordnet werden.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name des Projekts" },
          description: { type: "string", description: "Beschreibung des Projekts" },
          color: { type: "string", description: "Hex-Farbcode, z.B. #D97706" },
          deadline: { type: "string", description: "Deadline im Format YYYY-MM-DD" },
          area_id: { type: "integer", description: "ID der Area, der das Projekt zugeordnet werden soll. Nutze list_areas um verfügbare Areas zu sehen." }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "Aktualisiert ein Projekt",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID des Projekts" },
          name: { type: "string" },
          description: { type: "string" },
          color: { type: "string" },
          status: { type: "string", enum: ["active", "archived", "completed"] },
          deadline: { type: "string" },
          area_id: { type: "integer", description: "ID der Area (null zum Entfernen)" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "Listet alle Projekte auf",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "archived", "completed", "all"] }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_calendar_events",
      description: "Ruft Kalendertermine für einen Zeitraum ab",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Startdatum (YYYY-MM-DD)" },
          end_date: { type: "string", description: "Enddatum (YYYY-MM-DD)" },
          source: { type: "string", enum: ["outlook", "icloud", "local", "all"], description: "Kalenderquelle" }
        },
        required: ["start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Erstellt einen neuen Kalendereintrag. WICHTIG: Wenn der Nutzer keine Endzeit angibt, schätze eine sinnvolle Dauer basierend auf dem Termintyp (z.B. Meeting=1h, Arzt=1h, Abendessen=2h, Kaffee=30min).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titel des Termins" },
          start_time: { type: "string", description: "Startzeit (ISO 8601 Format)" },
          end_time: { type: "string", description: "Endzeit (ISO 8601 Format). IMMER angeben - bei fehlender Nutzerangabe selbst schätzen!" },
          description: { type: "string" },
          location: { type: "string", description: "Ort des Termins" },
          is_all_day: { type: "boolean", description: "Ganztägiger Termin" }
        },
        required: ["title", "start_time", "end_time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_calendar_event",
      description: "Aktualisiert einen bestehenden Kalendereintrag. Nutze get_calendar_events um die ID zu finden.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID des Termins" },
          title: { type: "string", description: "Neuer Titel" },
          start_time: { type: "string", description: "Neue Startzeit (ISO 8601 Format)" },
          end_time: { type: "string", description: "Neue Endzeit (ISO 8601 Format)" },
          description: { type: "string", description: "Neue Beschreibung" },
          location: { type: "string", description: "Neuer Ort" },
          is_all_day: { type: "boolean", description: "Ganztägiger Termin" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_calendar_event",
      description: "Löscht einen Kalendereintrag",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID des Termins" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "link_items",
      description: "Verknüpft zwei Items miteinander",
      parameters: {
        type: "object",
        properties: {
          source_type: { type: "string", enum: ["todo", "note", "event"] },
          source_id: { type: "integer" },
          target_type: { type: "string", enum: ["todo", "note", "event", "project"] },
          target_id: { type: "integer" }
        },
        required: ["source_type", "source_id", "target_type", "target_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_context",
      description: "Ruft aktuellen Kontext ab: offene Todos, anstehende Termine, aktive Projekte, Areas. Nutze dies um den aktuellen Stand zu verstehen.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_area",
      description: "Erstellt eine neue Area. Areas sind dauerhafte Verantwortungsbereiche nach dem PARA-Prinzip wie 'Arbeit', 'Gesundheit', 'Familie'.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name der Area" },
          description: { type: "string", description: "Beschreibung der Area" },
          icon: { type: "string", description: "Icon-Name (z.B. briefcase, heart, home, book)" },
          color: { type: "string", description: "Hex-Farbcode, z.B. #6366F1" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_areas",
      description: "Listet alle Areas auf",
      parameters: {
        type: "object",
        properties: {
          include_archived: { type: "boolean", description: "Auch archivierte anzeigen" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_resource",
      description: "Erstellt eine neue Ressource im Wissensspeicher. PARA: Ressourcen sind thematische Sammlungen (z.B. Rezepte, Anleitungen) und können mit MEHREREN Projekten verknüpft werden. Ressourcen haben KEINE Area-Zuordnung.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titel der Ressource" },
          content: { type: "string", description: "Inhalt (kann Markdown sein)" },
          url: { type: "string", description: "Optionaler Link" },
          tags: { type: "array", items: { type: "string" }, description: "Tags zur Kategorisierung" },
          category: { type: "string", description: "Kategorie wie 'Rezepte', 'Programmierung', 'Reisen'" },
          project_ids: { type: "array", items: { type: "integer" }, description: "IDs der Projekte, mit denen die Ressource verknüpft werden soll" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_resources",
      description: "Durchsucht den Wissensspeicher (Resources)",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Suchbegriff" },
          category: { type: "string", description: "Filter nach Kategorie" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "archive_item",
      description: "Archiviert ein Element (Todo, Notiz, Projekt, Area oder Ressource)",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["todo", "note", "project", "area", "resource"], description: "Typ des Elements" },
          id: { type: "integer", description: "ID des Elements" }
        },
        required: ["type", "id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "restore_item",
      description: "Stellt ein archiviertes Element wieder her",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["todo", "note", "project", "area", "resource"], description: "Typ des Elements" },
          id: { type: "integer", description: "ID des Elements" }
        },
        required: ["type", "id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_custom_tools",
      description: "Listet alle Custom Tools des Nutzers auf. Custom Tools sind interaktive Mini-Apps wie Uhren, Timer, Rechner, Kanban-Boards.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_custom_tool",
      description: "Erstellt ein neues Custom Tool basierend auf einer Beschreibung. Das Tool wird von der KI generiert und kann interaktiv sein (Timer, Uhren, Rechner, Kanban-Boards, etc.). WICHTIG: Formuliere eine detaillierte, präzise Beschreibung basierend auf den Wünschen des Nutzers. Nur möglich wenn weniger als 3 Tools vorhanden sind.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Detaillierte Beschreibung des gewünschten Tools in natürlicher Sprache, z.B. 'Ein Pomodoro-Timer mit 25 Minuten Arbeitszeit und 5 Minuten Pause, mit Start/Stop-Button und akustischem Signal' oder 'Eine Weltuhr die die Zeit in Berlin, New York und Tokyo anzeigt mit analoger Uhrenanzeige'" }
        },
        required: ["description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_custom_tool",
      description: "Aktualisiert ein bestehendes Custom Tool mit einer neuen Beschreibung. Das Tool wird neu generiert.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID des Tools" },
          description: { type: "string", description: "Neue Beschreibung für das Tool" }
        },
        required: ["id", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_custom_tool",
      description: "Löscht ein Custom Tool",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID des zu löschenden Tools" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_research",
      description: "Führt eine Web-Recherche mit Perplexity AI durch. Nutze dies wenn der Nutzer aktuelle Informationen benötigt, explizit nach Recherche fragt ('recherchiere', 'suche im Web'), oder du Fakten verifizieren möchtest. Liefert eine Zusammenfassung mit Quellen-Citations.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Die Suchanfrage. Formuliere präzise und spezifisch." },
          recency: { type: "string", enum: ["hour", "day", "week", "month"], description: "Optional: Zeitfilter für Quellen. 'hour' für sehr aktuelle, 'week' für letzte Woche." },
          domains: { type: "array", items: { type: "string" }, description: "Optional: Domains auf die Suche einschränken, z.B. ['wikipedia.org', 'arxiv.org']." }
        },
        required: ["query"]
      }
    }
  },
  // Email Tools
  {
    type: "function",
    function: {
      name: "search_emails",
      description: "Durchsucht E-Mails nach Absender, Betreff oder Inhalt. Nutze dies um E-Mails zu finden.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Suchbegriff (durchsucht Absender, Betreff, Inhalt)" },
          from: { type: "string", description: "Filtere nach Absender-Adresse oder Name" },
          folder: { type: "string", description: "Ordner (INBOX, Sent, etc.)", default: "INBOX" },
          unread_only: { type: "boolean", description: "Nur ungelesene E-Mails", default: false },
          limit: { type: "integer", description: "Maximale Anzahl Ergebnisse", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_email_content",
      description: "Lädt den vollständigen Inhalt einer E-Mail mit Body und Anhängen.",
      parameters: {
        type: "object",
        properties: {
          email_id: { type: "integer", description: "ID der E-Mail" }
        },
        required: ["email_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_email_thread",
      description: "Lädt alle E-Mails einer Konversation/Thread chronologisch.",
      parameters: {
        type: "object",
        properties: {
          email_id: { type: "integer", description: "ID einer E-Mail im Thread" }
        },
        required: ["email_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "draft_email_reply",
      description: "Erstellt einen Antwort-Entwurf für eine E-Mail. WICHTIG: Die E-Mail wird NICHT automatisch gesendet! Der Entwurf wird dem Nutzer zur Überprüfung und manuellen Bestätigung angezeigt.",
      parameters: {
        type: "object",
        properties: {
          email_id: { type: "integer", description: "ID der E-Mail auf die geantwortet wird" },
          body: { type: "string", description: "Antwort-Text (HTML oder Plain Text)" },
          reply_all: { type: "boolean", description: "An alle antworten", default: false }
        },
        required: ["email_id", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "draft_new_email",
      description: "Erstellt einen neuen E-Mail-Entwurf. WICHTIG: Die E-Mail wird NICHT automatisch gesendet! Der Entwurf wird dem Nutzer zur Überprüfung und manuellen Bestätigung angezeigt.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Empfänger E-Mail-Adresse" },
          subject: { type: "string", description: "Betreff" },
          body: { type: "string", description: "E-Mail-Text (HTML oder Plain Text)" }
        },
        required: ["to", "subject", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_unread_count",
      description: "Gibt die Anzahl ungelesener E-Mails zurück.",
      parameters: {
        type: "object",
        properties: {
          folder: { type: "string", description: "Ordner (default: INBOX)", default: "INBOX" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "summarize_emails",
      description: "Fasst E-Mails zusammen. Nutze dies um einen Überblick über mehrere E-Mails zu geben.",
      parameters: {
        type: "object",
        properties: {
          email_ids: { type: "array", items: { type: "integer" }, description: "IDs der E-Mails die zusammengefasst werden sollen" },
          focus: { type: "string", description: "Fokus der Zusammenfassung, z.B. 'action items', 'key dates', 'main points'" }
        },
        required: ["email_ids"]
      }
    }
  }
];

async function executeToolCall(toolName, args, userId) {
  try {
    switch (toolName) {
      case 'create_todo': {
        const result = db.prepare(`
          INSERT INTO todos (user_id, title, description, priority, due_date, due_time, project_id, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM todos WHERE user_id = ?))
        `).run(
          userId,
          args.title,
          args.description || null,
          args.priority || 3,
          args.due_date || null,
          args.due_time || null,
          args.project_id || null,
          userId
        );
        const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
        return { success: true, todo, message: `Todo "${args.title}" erstellt.` };
      }

      case 'update_todo': {
        const { id, ...updates } = args;
        const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, userId);
        if (!existing) return { success: false, error: 'Todo nicht gefunden.' };

        const setClause = Object.keys(updates)
          .filter(k => updates[k] !== undefined)
          .map(k => `${k} = ?`)
          .join(', ');

        if (setClause) {
          const values = Object.keys(updates)
            .filter(k => updates[k] !== undefined)
            .map(k => updates[k]);
          db.prepare(`UPDATE todos SET ${setClause} WHERE id = ?`).run(...values, id);
        }

        const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
        return { success: true, todo, message: 'Todo aktualisiert.' };
      }

      case 'complete_todo': {
        const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(args.id, userId);
        if (!existing) return { success: false, error: 'Todo nicht gefunden.' };

        const newStatus = existing.status === 'done' ? 'open' : 'done';
        db.prepare('UPDATE todos SET status = ? WHERE id = ?').run(newStatus, args.id);
        const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(args.id);

        let projectCompleted = false;
        let projectName = null;

        // Auto-complete project if all todos are done
        if (newStatus === 'done' && existing.project_id) {
          const projectTodos = db.prepare(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
            FROM todos WHERE project_id = ?
          `).get(existing.project_id);

          if (projectTodos.total > 0 && projectTodos.total === projectTodos.completed) {
            const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(existing.project_id);
            if (project && project.status === 'active') {
              db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('completed', existing.project_id);
              projectCompleted = true;
              projectName = project.name;
            }
          }
        }

        // Re-open project if a todo is reopened
        if (newStatus === 'open' && existing.project_id) {
          const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(existing.project_id);
          if (project && project.status === 'completed') {
            db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('active', existing.project_id);
          }
        }

        let message = newStatus === 'done' ? `"${todo.title}" als erledigt markiert.` : `"${todo.title}" wieder geöffnet.`;
        if (projectCompleted) {
          message += ` Projekt "${projectName}" wurde automatisch abgeschlossen!`;
        }

        return {
          success: true,
          todo,
          projectCompleted,
          message
        };
      }

      case 'list_todos': {
        let query = 'SELECT * FROM todos WHERE user_id = ?';
        const params = [userId];

        if (args.status && args.status !== 'all') {
          query += ' AND status = ?';
          params.push(args.status);
        }
        if (args.project_id) {
          query += ' AND project_id = ?';
          params.push(args.project_id);
        }
        if (args.priority) {
          query += ' AND priority = ?';
          params.push(args.priority);
        }
        if (args.due_before) {
          query += ' AND due_date <= ?';
          params.push(args.due_before);
        }

        query += ' ORDER BY priority ASC, due_date ASC NULLS LAST LIMIT 20';
        const todos = db.prepare(query).all(...params);
        return { success: true, todos, count: todos.length };
      }

      case 'delete_todo': {
        const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(args.id, userId);
        if (!existing) return { success: false, error: 'Todo nicht gefunden.' };

        db.prepare('DELETE FROM todos WHERE id = ?').run(args.id);
        return { success: true, message: `Todo "${existing.title}" gelöscht.` };
      }

      case 'create_note': {
        // PARA: Ensure exclusive container assignment
        const containers = [args.project_id, args.area_id, args.resource_id].filter(Boolean);
        if (containers.length > 1) {
          return { success: false, error: 'PARA-Fehler: Eine Notiz kann nur einem Container zugeordnet werden.' };
        }

        const result = db.prepare(`
          INSERT INTO notes (user_id, title, content, tags, color, project_id, area_id, resource_id, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM notes WHERE user_id = ?))
        `).run(
          userId,
          args.title,
          args.content || null,
          JSON.stringify(args.tags || []),
          args.color || null,
          args.project_id || null,
          args.area_id || null,
          args.resource_id || null,
          userId
        );
        const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
        return { success: true, note, message: `Notiz "${args.title}" erstellt.` };
      }

      case 'update_note': {
        const { id, ...updates } = args;
        const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId);
        if (!existing) return { success: false, error: 'Notiz nicht gefunden.' };

        if (updates.tags) {
          updates.tags = JSON.stringify(updates.tags);
        }
        if (updates.is_pinned !== undefined) {
          updates.is_pinned = updates.is_pinned ? 1 : 0;
        }

        const setClause = Object.keys(updates)
          .filter(k => updates[k] !== undefined)
          .map(k => `${k} = ?`)
          .join(', ');

        if (setClause) {
          const values = Object.keys(updates)
            .filter(k => updates[k] !== undefined)
            .map(k => updates[k]);
          db.prepare(`UPDATE notes SET ${setClause} WHERE id = ?`).run(...values, id);
        }

        const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
        return { success: true, note, message: 'Notiz aktualisiert.' };
      }

      case 'search_notes': {
        let query = 'SELECT * FROM notes WHERE user_id = ?';
        const params = [userId];

        if (args.query) {
          query += ' AND (title LIKE ? OR content LIKE ?)';
          params.push(`%${args.query}%`, `%${args.query}%`);
        }
        if (args.project_id) {
          query += ' AND project_id = ?';
          params.push(args.project_id);
        }

        query += ' ORDER BY updated_at DESC LIMIT 20';
        let notes = db.prepare(query).all(...params);

        if (args.tags && args.tags.length > 0) {
          notes = notes.filter(note => {
            const noteTags = JSON.parse(note.tags || '[]').map(t => t.toLowerCase());
            return args.tags.some(tag => noteTags.includes(tag.toLowerCase()));
          });
        }

        return { success: true, notes, count: notes.length };
      }

      case 'delete_note': {
        const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(args.id, userId);
        if (!existing) return { success: false, error: 'Notiz nicht gefunden.' };

        db.prepare('DELETE FROM notes WHERE id = ?').run(args.id);
        return { success: true, message: `Notiz "${existing.title}" gelöscht.` };
      }

      case 'create_project': {
        // Validate area_id if provided
        if (args.area_id) {
          const area = db.prepare('SELECT id, name FROM areas WHERE id = ? AND user_id = ?').get(args.area_id, userId);
          if (!area) {
            return { success: false, error: 'Area nicht gefunden.' };
          }
        }

        const result = db.prepare(`
          INSERT INTO projects (user_id, name, description, color, deadline, area_id, position)
          VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM projects WHERE user_id = ?))
        `).run(
          userId,
          args.name,
          args.description || null,
          args.color || '#D97706',
          args.deadline || null,
          args.area_id || null,
          userId
        );
        const project = db.prepare(`
          SELECT p.*, a.name as area_name
          FROM projects p
          LEFT JOIN areas a ON p.area_id = a.id
          WHERE p.id = ?
        `).get(result.lastInsertRowid);

        const areaInfo = project.area_name ? ` in Area "${project.area_name}"` : '';
        return { success: true, project, message: `Projekt "${args.name}"${areaInfo} erstellt.` };
      }

      case 'update_project': {
        const { id, ...updates } = args;
        const existing = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
        if (!existing) return { success: false, error: 'Projekt nicht gefunden.' };

        const setClause = Object.keys(updates)
          .filter(k => updates[k] !== undefined)
          .map(k => `${k} = ?`)
          .join(', ');

        if (setClause) {
          const values = Object.keys(updates)
            .filter(k => updates[k] !== undefined)
            .map(k => updates[k]);
          db.prepare(`UPDATE projects SET ${setClause} WHERE id = ?`).run(...values, id);
        }

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        return { success: true, project, message: 'Projekt aktualisiert.' };
      }

      case 'list_projects': {
        let query = `
          SELECT p.*, a.name as area_name
          FROM projects p
          LEFT JOIN areas a ON p.area_id = a.id
          WHERE p.user_id = ?
        `;
        const params = [userId];

        if (args.status && args.status !== 'all') {
          query += ' AND p.status = ?';
          params.push(args.status);
        }

        query += ' ORDER BY p.position ASC';
        const projects = db.prepare(query).all(...params);

        const projectsWithStats = projects.map(project => {
          const stats = db.prepare(`
            SELECT COUNT(*) as total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
            FROM todos WHERE project_id = ?
          `).get(project.id);
          return { ...project, todoCount: stats.total, completedCount: stats.completed };
        });

        return { success: true, projects: projectsWithStats };
      }

      case 'get_calendar_events': {
        let query = 'SELECT * FROM calendar_events WHERE user_id = ? AND start_time >= ? AND start_time <= ?';
        const params = [userId, args.start_date, args.end_date + 'T23:59:59'];

        if (args.source && args.source !== 'all') {
          query += ' AND calendar_source = ?';
          params.push(args.source);
        }

        query += ' ORDER BY start_time ASC';
        const events = db.prepare(query).all(...params);
        return { success: true, events, count: events.length };
      }

      case 'create_calendar_event': {
        const result = db.prepare(`
          INSERT INTO calendar_events (user_id, title, description, start_time, end_time, location, is_all_day, calendar_source)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'local')
        `).run(
          userId,
          args.title,
          args.description || null,
          args.start_time,
          args.end_time,
          args.location || null,
          args.is_all_day ? 1 : 0
        );
        const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(result.lastInsertRowid);
        return { success: true, event, message: `Termin "${args.title}" erstellt.` };
      }

      case 'update_calendar_event': {
        const existingEvent = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?').get(args.id, userId);
        if (!existingEvent) {
          return { success: false, error: 'Termin nicht gefunden.' };
        }

        const updates = [];
        const params = [];

        if (args.title !== undefined) { updates.push('title = ?'); params.push(args.title); }
        if (args.start_time !== undefined) { updates.push('start_time = ?'); params.push(args.start_time); }
        if (args.end_time !== undefined) { updates.push('end_time = ?'); params.push(args.end_time); }
        if (args.description !== undefined) { updates.push('description = ?'); params.push(args.description); }
        if (args.location !== undefined) { updates.push('location = ?'); params.push(args.location); }
        if (args.is_all_day !== undefined) { updates.push('is_all_day = ?'); params.push(args.is_all_day ? 1 : 0); }

        if (updates.length === 0) {
          return { success: false, error: 'Keine Änderungen angegeben.' };
        }

        params.push(args.id, userId);
        db.prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

        const updatedEvent = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(args.id);
        return { success: true, event: updatedEvent, message: `Termin "${updatedEvent.title}" aktualisiert.` };
      }

      case 'delete_calendar_event': {
        const eventToDelete = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?').get(args.id, userId);
        if (!eventToDelete) {
          return { success: false, error: 'Termin nicht gefunden.' };
        }

        db.prepare('DELETE FROM calendar_events WHERE id = ? AND user_id = ?').run(args.id, userId);
        return { success: true, message: `Termin "${eventToDelete.title}" gelöscht.` };
      }

      case 'link_items': {
        const existing = db.prepare(`
          SELECT id FROM item_links
          WHERE source_type = ? AND source_id = ? AND target_type = ? AND target_id = ?
        `).get(args.source_type, args.source_id, args.target_type, args.target_id);

        if (existing) {
          return { success: true, message: 'Verknüpfung existiert bereits.' };
        }

        db.prepare(`
          INSERT INTO item_links (source_type, source_id, target_type, target_id)
          VALUES (?, ?, ?, ?)
        `).run(args.source_type, args.source_id, args.target_type, args.target_id);

        return { success: true, message: 'Verknüpfung erstellt.' };
      }

      case 'get_context': {
        const openTodos = db.prepare(`
          SELECT t.*, p.name as project_name
          FROM todos t LEFT JOIN projects p ON t.project_id = p.id
          WHERE t.user_id = ? AND t.status IN ('open', 'in_progress')
          ORDER BY t.priority ASC, t.due_date ASC NULLS LAST
          LIMIT 10
        `).all(userId);

        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const upcomingEvents = db.prepare(`
          SELECT * FROM calendar_events
          WHERE user_id = ? AND start_time >= ? AND start_time <= ?
          ORDER BY start_time ASC LIMIT 10
        `).all(userId, today, nextWeek + 'T23:59:59');

        const activeProjects = db.prepare(`
          SELECT * FROM projects WHERE user_id = ? AND status = 'active'
          ORDER BY position ASC LIMIT 10
        `).all(userId);

        const recentNotes = db.prepare(`
          SELECT id, title, tags FROM notes WHERE user_id = ?
          ORDER BY updated_at DESC LIMIT 5
        `).all(userId);

        const activeAreas = db.prepare(`
          SELECT * FROM areas WHERE user_id = ? AND is_archived = 0
          ORDER BY position ASC LIMIT 10
        `).all(userId);

        return {
          success: true,
          context: {
            openTodos,
            upcomingEvents,
            activeProjects,
            activeAreas,
            recentNotes,
            today
          }
        };
      }

      case 'create_area': {
        const result = db.prepare(`
          INSERT INTO areas (user_id, name, description, icon, color, position)
          VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM areas WHERE user_id = ?))
        `).run(
          userId,
          args.name,
          args.description || null,
          args.icon || 'folder',
          args.color || '#6366F1',
          userId
        );
        const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(result.lastInsertRowid);
        return { success: true, area, message: `Area "${args.name}" erstellt.` };
      }

      case 'list_areas': {
        let query = 'SELECT * FROM areas WHERE user_id = ?';
        if (!args.include_archived) {
          query += ' AND is_archived = 0';
        }
        query += ' ORDER BY position ASC';
        const areas = db.prepare(query).all(userId);
        return { success: true, areas, count: areas.length };
      }

      case 'create_resource': {
        // PARA: Resources can be linked to multiple Projects (n:m)
        const result = db.prepare(`
          INSERT INTO resources (user_id, title, content, url, tags, category, position)
          VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM resources WHERE user_id = ?))
        `).run(
          userId,
          args.title,
          args.content || null,
          args.url || null,
          JSON.stringify(args.tags || []),
          args.category || null,
          userId
        );

        const resourceId = result.lastInsertRowid;

        // Link to projects using junction table
        if (args.project_ids && Array.isArray(args.project_ids) && args.project_ids.length > 0) {
          const insertLink = db.prepare('INSERT OR IGNORE INTO project_resources (project_id, resource_id) VALUES (?, ?)');
          for (const projectId of args.project_ids) {
            insertLink.run(projectId, resourceId);
          }
        }

        const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId);
        return { success: true, resource, message: `Ressource "${args.title}" erstellt.` };
      }

      case 'search_resources': {
        let query = 'SELECT * FROM resources WHERE user_id = ? AND is_archived = 0';
        const params = [userId];

        if (args.query) {
          query += ' AND (title LIKE ? OR content LIKE ?)';
          params.push(`%${args.query}%`, `%${args.query}%`);
        }
        if (args.category) {
          query += ' AND category = ?';
          params.push(args.category);
        }

        query += ' ORDER BY updated_at DESC LIMIT 20';
        const resources = db.prepare(query).all(...params);
        return { success: true, resources, count: resources.length };
      }

      case 'archive_item': {
        const { type, id } = args;
        let table, column, value;

        switch (type) {
          case 'project':
            table = 'projects'; column = 'status'; value = 'archived';
            break;
          case 'todo':
            table = 'todos'; column = 'is_archived'; value = 1;
            break;
          case 'note':
            table = 'notes'; column = 'is_archived'; value = 1;
            break;
          case 'area':
            table = 'areas'; column = 'is_archived'; value = 1;
            break;
          case 'resource':
            table = 'resources'; column = 'is_archived'; value = 1;
            break;
          default:
            return { success: false, error: 'Ungültiger Typ' };
        }

        const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId);
        if (!existing) return { success: false, error: 'Element nicht gefunden.' };

        db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`).run(value, id);
        return { success: true, message: `Element archiviert.` };
      }

      case 'restore_item': {
        const { type, id } = args;
        let table, column, value;

        switch (type) {
          case 'project':
            table = 'projects'; column = 'status'; value = 'active';
            break;
          case 'todo':
            table = 'todos'; column = 'is_archived'; value = 0;
            break;
          case 'note':
            table = 'notes'; column = 'is_archived'; value = 0;
            break;
          case 'area':
            table = 'areas'; column = 'is_archived'; value = 0;
            break;
          case 'resource':
            table = 'resources'; column = 'is_archived'; value = 0;
            break;
          default:
            return { success: false, error: 'Ungültiger Typ' };
        }

        const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId);
        if (!existing) return { success: false, error: 'Element nicht gefunden.' };

        db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`).run(value, id);
        return { success: true, message: `Element wiederhergestellt.` };
      }

      case 'list_custom_tools': {
        const tools = db.prepare(`
          SELECT id, name, description, status, error_message, created_at
          FROM custom_tools
          WHERE user_id = ?
          ORDER BY position ASC
        `).all(userId);
        return {
          success: true,
          tools,
          count: tools.length,
          maxTools: 3
        };
      }

      case 'create_custom_tool': {
        // Check tool limit (max 3)
        const toolCount = db.prepare('SELECT COUNT(*) as count FROM custom_tools WHERE user_id = ?').get(userId);
        if (toolCount.count >= 3) {
          return {
            success: false,
            error: 'Du hast bereits 3 Custom Tools. Lösche ein Tool, um ein neues zu erstellen.'
          };
        }

        const { v4: uuidv4 } = require('uuid');
        const { generateToolCode } = require('./codeGenerator');

        const toolId = uuidv4();
        const toolName = `Tool ${new Date().toLocaleDateString('de-DE')}`;

        // Get max position
        const maxPos = db.prepare('SELECT MAX(position) as max FROM custom_tools WHERE user_id = ?').get(userId);

        // Create tool in 'generating' status
        db.prepare(`
          INSERT INTO custom_tools (id, user_id, name, description, status, position)
          VALUES (?, ?, ?, ?, 'generating', ?)
        `).run(toolId, userId, toolName, args.description, (maxPos.max || 0) + 1);

        // Trigger code generation asynchronously
        generateToolCode(userId, toolId, args.description)
          .then(result => {
            if (result.success) {
              db.prepare(`
                UPDATE custom_tools
                SET generated_code = ?,
                    parameters_schema = ?,
                    name = ?,
                    refresh_interval = ?,
                    status = 'ready',
                    error_message = NULL
                WHERE id = ?
              `).run(
                result.code,
                JSON.stringify(result.parameters || {}),
                result.name || toolName,
                result.refreshInterval || 0,
                toolId
              );

              // Auto-execute the widget
              const { executeInSandbox } = require('./sandbox');
              executeInSandbox(result.code, result.parameters || {})
                .then(execResult => {
                  db.prepare(`
                    UPDATE custom_tools
                    SET last_result = ?, last_result_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                  `).run(JSON.stringify(execResult), toolId);

                  if (global.io) {
                    global.io.to(`user:${userId}`).emit('tool:updated', {
                      toolId,
                      status: 'ready',
                      result: execResult,
                      refreshInterval: result.refreshInterval || 0
                    });
                  }
                })
                .catch(() => {
                  if (global.io) {
                    global.io.to(`user:${userId}`).emit('tool:updated', {
                      toolId,
                      status: 'ready',
                      refreshInterval: result.refreshInterval || 0
                    });
                  }
                });
            } else {
              db.prepare(`
                UPDATE custom_tools
                SET status = 'error', error_message = ?
                WHERE id = ?
              `).run(result.error || 'Unbekannter Fehler', toolId);

              if (global.io) {
                global.io.to(`user:${userId}`).emit('tool:updated', {
                  toolId,
                  status: 'error',
                  error: result.error
                });
              }
            }
          })
          .catch(err => {
            db.prepare(`
              UPDATE custom_tools
              SET status = 'error', error_message = ?
              WHERE id = ?
            `).run('Fehler: ' + err.message, toolId);
          });

        return {
          success: true,
          toolId: toolId,
          message: `Custom Tool wird erstellt: "${args.description}". Es erscheint in wenigen Sekunden auf der Custom Tools Seite.`
        };
      }

      case 'update_custom_tool': {
        const tool = db.prepare('SELECT * FROM custom_tools WHERE id = ? AND user_id = ?').get(args.id, userId);
        if (!tool) {
          return { success: false, error: 'Custom Tool nicht gefunden.' };
        }

        const { generateToolCode } = require('./codeGenerator');

        // Update to generating status
        db.prepare(`
          UPDATE custom_tools
          SET description = ?, status = 'generating', error_message = NULL
          WHERE id = ?
        `).run(args.description, args.id);

        // Regenerate code
        generateToolCode(userId, args.id, args.description)
          .then(result => {
            if (result.success) {
              db.prepare(`
                UPDATE custom_tools
                SET generated_code = ?,
                    parameters_schema = ?,
                    name = ?,
                    refresh_interval = ?,
                    status = 'ready',
                    error_message = NULL
                WHERE id = ?
              `).run(
                result.code,
                JSON.stringify(result.parameters || {}),
                result.name || tool.name,
                result.refreshInterval || 0,
                args.id
              );

              // Auto-execute
              const { executeInSandbox } = require('./sandbox');
              executeInSandbox(result.code, result.parameters || {})
                .then(execResult => {
                  db.prepare(`
                    UPDATE custom_tools
                    SET last_result = ?, last_result_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                  `).run(JSON.stringify(execResult), args.id);

                  if (global.io) {
                    global.io.to(`user:${userId}`).emit('tool:updated', {
                      toolId: args.id,
                      status: 'ready',
                      result: execResult
                    });
                  }
                })
                .catch(() => {});
            } else {
              db.prepare(`
                UPDATE custom_tools
                SET status = 'error', error_message = ?
                WHERE id = ?
              `).run(result.error, args.id);

              if (global.io) {
                global.io.to(`user:${userId}`).emit('tool:updated', {
                  toolId: args.id,
                  status: 'error',
                  error: result.error
                });
              }
            }
          })
          .catch(err => {
            db.prepare(`
              UPDATE custom_tools
              SET status = 'error', error_message = ?
              WHERE id = ?
            `).run(err.message, args.id);
          });

        return {
          success: true,
          message: `Custom Tool "${tool.name}" wird aktualisiert mit: "${args.description}"`
        };
      }

      case 'delete_custom_tool': {
        const tool = db.prepare('SELECT * FROM custom_tools WHERE id = ? AND user_id = ?').get(args.id, userId);
        if (!tool) {
          return { success: false, error: 'Custom Tool nicht gefunden.' };
        }

        db.prepare('DELETE FROM custom_tools WHERE id = ?').run(args.id);
        return { success: true, message: `Custom Tool "${tool.name}" gelöscht.` };
      }

      case 'web_research': {
        const { webResearch } = require('./perplexity');
        const result = await webResearch(args.query, userId, {
          recency: args.recency,
          domains: args.domains
        });

        if (!result.success) {
          return {
            success: false,
            type: 'research',
            query: args.query,
            error: result.error
          };
        }

        return {
          success: true,
          type: 'research',
          query: args.query,
          summary: result.summary,
          citations: result.citations,
          relatedQuestions: result.relatedQuestions,
          message: `Recherche zu "${args.query}" abgeschlossen.`
        };
      }

      // Email Tools
      case 'search_emails': {
        // Get user's email accounts
        const accounts = db.prepare(
          'SELECT id FROM email_accounts WHERE user_id = ? AND is_active = 1'
        ).all(userId);

        if (accounts.length === 0) {
          return {
            success: false,
            error: 'Keine E-Mail-Accounts verbunden. Bitte verbinde einen Account in den Einstellungen.'
          };
        }

        const accountIds = accounts.map(a => a.id);
        const placeholders = accountIds.map(() => '?').join(',');

        let query = `
          SELECT e.id, e.from_address, e.from_name, e.subject, e.snippet, e.date, e.is_read,
                 ea.email as account_email, ea.color as account_color
          FROM emails e
          JOIN email_accounts ea ON e.account_id = ea.id
          WHERE e.account_id IN (${placeholders})
        `;
        const params = [...accountIds];

        if (args.query) {
          query += ' AND (e.subject LIKE ? OR e.from_name LIKE ? OR e.from_address LIKE ? OR e.snippet LIKE ?)';
          const searchTerm = `%${args.query}%`;
          params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (args.from) {
          query += ' AND (e.from_address LIKE ? OR e.from_name LIKE ?)';
          const fromTerm = `%${args.from}%`;
          params.push(fromTerm, fromTerm);
        }

        if (args.folder) {
          query += ' AND e.folder = ?';
          params.push(args.folder);
        }

        if (args.unread_only) {
          query += ' AND e.is_read = 0';
        }

        query += ' ORDER BY e.date DESC LIMIT ?';
        params.push(args.limit || 10);

        const emails = db.prepare(query).all(...params);

        return {
          success: true,
          emails: emails.map(e => ({
            id: e.id,
            from: e.from_name || e.from_address,
            from_address: e.from_address,
            subject: e.subject,
            snippet: e.snippet,
            date: e.date,
            is_read: e.is_read === 1,
            account: e.account_email
          })),
          count: emails.length,
          message: `${emails.length} E-Mail(s) gefunden.`
        };
      }

      case 'get_email_content': {
        const email = db.prepare(`
          SELECT e.*, ea.user_id
          FROM emails e
          JOIN email_accounts ea ON e.account_id = ea.id
          WHERE e.id = ?
        `).get(args.email_id);

        if (!email || email.user_id !== userId) {
          return { success: false, error: 'E-Mail nicht gefunden.' };
        }

        // Load body if not cached
        const emailSync = require('./emailSync');
        const fullEmail = await emailSync.loadEmailBody(args.email_id);

        // Filter sensitive content for agent context
        let safeBody = fullEmail.body_text || '';
        // Remove potential passwords and sensitive data
        safeBody = safeBody.replace(/password[:\s]+\S+/gi, '[PASSWORT ENTFERNT]');
        safeBody = safeBody.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[KREDITKARTE ENTFERNT]');

        return {
          success: true,
          email: {
            id: fullEmail.id,
            from: fullEmail.from_name || fullEmail.from_address,
            from_address: fullEmail.from_address,
            to: fullEmail.to_addresses,
            subject: fullEmail.subject,
            date: fullEmail.date,
            body: safeBody.substring(0, 3000), // Limit for context
            is_read: fullEmail.is_read === 1
          },
          message: 'E-Mail-Inhalt geladen.'
        };
      }

      case 'get_email_thread': {
        const email = db.prepare(`
          SELECT e.thread_id, ea.user_id
          FROM emails e
          JOIN email_accounts ea ON e.account_id = ea.id
          WHERE e.id = ?
        `).get(args.email_id);

        if (!email || email.user_id !== userId) {
          return { success: false, error: 'E-Mail nicht gefunden.' };
        }

        const emailSync = require('./emailSync');
        const thread = await emailSync.getEmailThread(args.email_id);

        return {
          success: true,
          thread: thread.map(e => ({
            id: e.id,
            from: e.from_name || e.from_address,
            subject: e.subject,
            date: e.date,
            snippet: e.snippet,
            is_read: e.is_read === 1
          })),
          count: thread.length,
          message: `Thread mit ${thread.length} E-Mail(s) geladen.`
        };
      }

      case 'draft_email_reply': {
        const email = db.prepare(`
          SELECT e.*, ea.id as account_id, ea.user_id, ea.email as sender_email
          FROM emails e
          JOIN email_accounts ea ON e.account_id = ea.id
          WHERE e.id = ?
        `).get(args.email_id);

        if (!email || email.user_id !== userId) {
          return { success: false, error: 'E-Mail nicht gefunden.' };
        }

        const smtpService = require('./smtp');
        const reply = smtpService.createReply(email, args.body, args.reply_all, email.sender_email);

        // Save as draft
        const result = db.prepare(`
          INSERT INTO email_drafts (user_id, account_id, to_addresses, cc_addresses, subject, body_html, in_reply_to_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          email.account_id,
          JSON.stringify([reply.to]),
          reply.cc ? JSON.stringify(reply.cc) : null,
          reply.subject,
          reply.html,
          args.email_id
        );

        return {
          success: true,
          type: 'email_draft',
          draft_id: result.lastInsertRowid,
          to: reply.to,
          cc: reply.cc,
          subject: reply.subject,
          preview: args.body.substring(0, 200),
          message: 'Antwort-Entwurf erstellt. Der Nutzer kann ihn in den E-Mails überprüfen und senden.'
        };
      }

      case 'draft_new_email': {
        // Get first active account if no account specified
        const account = db.prepare(
          'SELECT id FROM email_accounts WHERE user_id = ? AND is_active = 1 LIMIT 1'
        ).get(userId);

        if (!account) {
          return {
            success: false,
            error: 'Kein E-Mail-Account verbunden. Bitte verbinde einen Account in den Einstellungen.'
          };
        }

        // Save as draft
        const result = db.prepare(`
          INSERT INTO email_drafts (user_id, account_id, to_addresses, subject, body_html)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          userId,
          account.id,
          JSON.stringify([args.to]),
          args.subject,
          args.body
        );

        return {
          success: true,
          type: 'email_draft',
          draft_id: result.lastInsertRowid,
          to: args.to,
          subject: args.subject,
          preview: args.body.substring(0, 200),
          message: 'E-Mail-Entwurf erstellt. Der Nutzer kann ihn in den E-Mails überprüfen und senden.'
        };
      }

      case 'get_unread_count': {
        const accounts = db.prepare(
          'SELECT id FROM email_accounts WHERE user_id = ? AND is_active = 1'
        ).all(userId);

        if (accounts.length === 0) {
          return { success: true, count: 0, message: 'Keine E-Mail-Accounts verbunden.' };
        }

        const accountIds = accounts.map(a => a.id);
        const placeholders = accountIds.map(() => '?').join(',');

        let query = `
          SELECT COUNT(*) as count FROM emails
          WHERE account_id IN (${placeholders}) AND is_read = 0
        `;
        const params = [...accountIds];

        if (args.folder) {
          query += ' AND folder = ?';
          params.push(args.folder);
        }

        const { count } = db.prepare(query).get(...params);

        return {
          success: true,
          count,
          message: count === 0 ? 'Keine ungelesenen E-Mails.' : `${count} ungelesene E-Mail(s).`
        };
      }

      case 'summarize_emails': {
        if (!args.email_ids || args.email_ids.length === 0) {
          return { success: false, error: 'Keine E-Mail-IDs angegeben.' };
        }

        const placeholders = args.email_ids.map(() => '?').join(',');
        const emails = db.prepare(`
          SELECT e.*, ea.user_id
          FROM emails e
          JOIN email_accounts ea ON e.account_id = ea.id
          WHERE e.id IN (${placeholders})
        `).all(...args.email_ids);

        // Verify ownership
        if (emails.some(e => e.user_id !== userId)) {
          return { success: false, error: 'Zugriff verweigert.' };
        }

        // Build summary from snippets
        const summaryData = emails.map(e => ({
          from: e.from_name || e.from_address,
          subject: e.subject,
          date: e.date,
          snippet: e.snippet
        }));

        return {
          success: true,
          emails: summaryData,
          count: emails.length,
          focus: args.focus || 'main points',
          message: `${emails.length} E-Mail(s) zur Zusammenfassung bereit. Die E-Mails sind von ${[...new Set(emails.map(e => e.from_name || e.from_address))].join(', ')}.`
        };
      }

      default:
        return { success: false, error: `Unbekannte Funktion: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return { success: false, error: error.message };
  }
}

async function processAgentRequest(message, userId, chatHistory = []) {
  const openai = createOpenAIClient(userId);

  if (!openai) {
    return {
      response: 'OpenAI API-Key nicht konfiguriert. Bitte in den Einstellungen unter "KI-Assistent" deinen API-Key hinterlegen.',
      actions: []
    };
  }

  // Build messages array with chat history for context
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Add chat history (last 15 conversations, last 5 include research results)
  for (const entry of chatHistory) {
    if (entry.user) {
      messages.push({ role: 'user', content: entry.user });
    }
    if (entry.assistant) {
      messages.push({ role: 'assistant', content: entry.assistant });
    }
  }

  // Add current user message
  messages.push({ role: 'user', content: message });

  const actions = [];
  let iterations = 0;
  const maxIterations = 15;

  try {
    while (iterations < maxIterations) {
      iterations++;

      // Only use user's model selection if they have their own API key
      const userApiKey = getUserApiKey(userId);
      const userModel = userApiKey ? getUserModel(userId) : null;
      const model = userModel || process.env.OPENAI_MODEL || 'gpt-4o-mini';

      const response = await openai.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: 'auto'
      });

      const assistantMessage = response.choices[0].message;
      messages.push(assistantMessage);

      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        const content = assistantMessage.content || '';

        // Detect if model claims to have done something without actually calling a tool
        const actionClaimPatterns = /\b(erstellt|hinzugefügt|angelegt|geändert|aktualisiert|gelöscht|entfernt|gespeichert|eingetragen|geplant|verschoben)\b/i;
        const claimsAction = actionClaimPatterns.test(content);

        // If no actions were executed but model claims to have done something, warn user
        if (claimsAction && actions.length === 0) {
          return {
            response: 'Der Agent war nicht intelligent genug, um die Aktion auszuführen. Wähle ein besseres Modell in den Einstellungen oder drücke dich präziser aus.',
            actions,
            _warning: 'Model claimed action without tool call'
          };
        }

        return {
          response: content || 'Wie kann ich dir helfen?',
          actions
        };
      }

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        const result = await executeToolCall(functionName, functionArgs, userId);

        actions.push({
          tool: functionName,
          args: functionArgs,
          result
        });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
    }

    return {
      response: 'Maximale Anzahl an Aktionen erreicht.',
      actions
    };
  } catch (error) {
    console.error('OpenAI API error:', error);

    if (error.code === 'invalid_api_key') {
      return {
        response: 'Ungültiger OpenAI API-Key. Bitte in den Einstellungen korrigieren.',
        actions: []
      };
    }

    return {
      response: `Fehler bei der Verarbeitung: ${error.message}`,
      actions: []
    };
  }
}

module.exports = {
  processAgentRequest,
  executeToolCall
};
