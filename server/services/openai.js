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
Du hilfst dem Nutzer, Aufgaben zu organisieren, Termine zu planen und Notizen zu verwalten.

Deine Fähigkeiten:
- Todos erstellen, bearbeiten, priorisieren, abschließen, löschen
- Notizen erstellen, bearbeiten und durchsuchen
- Projekte erstellen und verwalten (mit automatischer Area-Zuordnung)
- Kalendertermine abrufen und neue erstellen
- Items miteinander verknüpfen
- Areas verwalten - dauerhafte Verantwortungsbereiche nach dem PARA-Prinzip wie Arbeit, Gesundheit, Familie
- Widgets erstellen, anpassen und löschen (interaktive Mini-Apps wie Uhren, Timer, Rechner, Countdowns)

WICHTIGE ANTWORT-REGELN:
- Antworte IMMER sehr kurz und prägnant (1-2 Sätze maximal)
- KEINE Links oder URLs in deinen Antworten - die werden separat angezeigt
- KEINE Listen, Aufzählungen oder formatierte Texte
- Bestätige Aktionen mit einem einfachen kurzen Satz
- Nach web_research: Antworte NUR mit einem SEHR kurzen Satz (max 10 Wörter), z.B. "Hier sind die Recherche-Ergebnisse." oder "Ich habe das für dich recherchiert." - Die Details werden dem Nutzer automatisch in einer separaten Box angezeigt.

Weitere Regeln:
1. Führe Aktionen direkt aus, frage nur bei echten Unklarheiten nach
2. Wenn der Nutzer etwas Unklares sagt, interpretiere es bestmöglich
3. PARA-Verknüpfungen: Verknüpfe IMMER automatisch - nutze list_projects/list_areas um passende zuzuordnen. Erstelle Todo mit project_id wenn ein passendes Projekt existiert. Bei neuem Projekt mit Todos: erst Projekt erstellen, dann Todos mit dessen project_id.
4. Nutze Kontext aus bestehenden Projekten und Todos
5. Bei Zeitangaben wie "morgen", "nächste Woche" berechne das korrekte Datum
6. Antworte immer auf Deutsch
7. Bei Widget-Anfragen: Nutze list_widgets um bestehende Widgets zu sehen, create_widget für neue, update_widget zum Ändern
8. Bei Projekterstellung: Ordne das Projekt automatisch einer passenden Area zu. Nutze zuerst list_areas um bestehende Areas zu sehen. Wenn keine passende Area existiert, erstelle eine neue mit create_area, bevor du das Projekt erstellst.
9. Nutze web_research wenn der Nutzer nach aktuellen Informationen fragt, "recherchiere", "suche im Web", "was gibt es Neues zu..." sagt, oder du Fakten verifizieren möchtest
10. WICHTIG: Führe maximal 1-2 web_research Aufrufe pro Nutzeranfrage durch. Nach der Recherche antworte sofort - mache KEINE weiteren Recherchen.

Heute ist ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

const tools = [
  {
    type: "function",
    function: {
      name: "create_todo",
      description: "Erstellt ein neues Todo/eine neue Aufgabe",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titel des Todos" },
          description: { type: "string", description: "Optionale Beschreibung" },
          priority: { type: "integer", minimum: 1, maximum: 5, description: "1=höchste, 5=niedrigste Priorität. Standard ist 3." },
          due_date: { type: "string", description: "Fälligkeitsdatum im Format YYYY-MM-DD" },
          due_time: { type: "string", description: "Uhrzeit im Format HH:MM" },
          project_id: { type: "integer", description: "ID des Projekts, dem das Todo zugeordnet werden soll" }
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
      description: "Erstellt eine neue Notiz",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titel der Notiz" },
          content: { type: "string", description: "Inhalt der Notiz (kann Markdown sein)" },
          tags: { type: "array", items: { type: "string" }, description: "Tags für die Notiz" },
          project_id: { type: "integer", description: "Projekt-ID für Zuordnung" },
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
      description: "Aktualisiert eine bestehende Notiz",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID der Notiz" },
          title: { type: "string" },
          content: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          project_id: { type: "integer" },
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
      description: "Erstellt einen neuen Kalendereintrag",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titel des Termins" },
          start_time: { type: "string", description: "Startzeit (ISO 8601 Format)" },
          end_time: { type: "string", description: "Endzeit (ISO 8601 Format)" },
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
      description: "Erstellt eine neue Ressource im Wissensspeicher. Ressourcen sind Informationen zu Themen wie Rezepte, Anleitungen, Links.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titel der Ressource" },
          content: { type: "string", description: "Inhalt (kann Markdown sein)" },
          url: { type: "string", description: "Optionaler Link" },
          tags: { type: "array", items: { type: "string" }, description: "Tags zur Kategorisierung" },
          category: { type: "string", description: "Kategorie wie 'Rezepte', 'Programmierung', 'Reisen'" }
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
      name: "list_widgets",
      description: "Listet alle Widgets des Nutzers auf. Widgets sind interaktive Mini-Apps wie Uhren, Timer, Rechner.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_widget",
      description: "Erstellt ein neues Widget basierend auf einer Beschreibung. Das Widget wird von der KI generiert und kann interaktiv sein (Timer, Uhren, Rechner, etc.).",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Beschreibung des gewünschten Widgets in natürlicher Sprache, z.B. 'Ein Pomodoro-Timer mit 25 Minuten' oder 'Eine Weltuhr für Berlin und Tokyo'" }
        },
        required: ["description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_widget",
      description: "Aktualisiert ein bestehendes Widget mit einer neuen Beschreibung. Das Widget wird neu generiert.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID des Widgets" },
          description: { type: "string", description: "Neue Beschreibung für das Widget" }
        },
        required: ["id", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_widget",
      description: "Löscht ein Widget",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID des zu löschenden Widgets" }
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
        const result = db.prepare(`
          INSERT INTO notes (user_id, title, content, tags, color, project_id, position)
          VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM notes WHERE user_id = ?))
        `).run(
          userId,
          args.title,
          args.content || null,
          JSON.stringify(args.tags || []),
          args.color || null,
          args.project_id || null,
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
        const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(result.lastInsertRowid);
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

      case 'list_widgets': {
        const widgets = db.prepare(`
          SELECT id, name, description, status, error_message, created_at
          FROM custom_tools
          WHERE user_id = ?
          ORDER BY position ASC
        `).all(userId);
        return {
          success: true,
          widgets,
          count: widgets.length,
          maxWidgets: 3
        };
      }

      case 'create_widget': {
        // Check widget limit (max 3)
        const widgetCount = db.prepare('SELECT COUNT(*) as count FROM custom_tools WHERE user_id = ?').get(userId);
        if (widgetCount.count >= 3) {
          return {
            success: false,
            error: 'Du hast bereits 3 Widgets. Lösche ein Widget, um ein neues zu erstellen.'
          };
        }

        const { v4: uuidv4 } = require('uuid');
        const { generateToolCode } = require('./codeGenerator');

        const toolId = uuidv4();
        const toolName = `Widget ${new Date().toLocaleDateString('de-DE')}`;

        // Get max position
        const maxPos = db.prepare('SELECT MAX(position) as max FROM custom_tools WHERE user_id = ?').get(userId);

        // Create widget in 'generating' status
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
          widgetId: toolId,
          message: `Widget wird erstellt: "${args.description}". Es erscheint in wenigen Sekunden auf der Widgets-Seite.`
        };
      }

      case 'update_widget': {
        const widget = db.prepare('SELECT * FROM custom_tools WHERE id = ? AND user_id = ?').get(args.id, userId);
        if (!widget) {
          return { success: false, error: 'Widget nicht gefunden.' };
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
                result.name || widget.name,
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
          message: `Widget "${widget.name}" wird aktualisiert mit: "${args.description}"`
        };
      }

      case 'delete_widget': {
        const widget = db.prepare('SELECT * FROM custom_tools WHERE id = ? AND user_id = ?').get(args.id, userId);
        if (!widget) {
          return { success: false, error: 'Widget nicht gefunden.' };
        }

        db.prepare('DELETE FROM custom_tools WHERE id = ?').run(args.id);
        return { success: true, message: `Widget "${widget.name}" gelöscht.` };
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
        return {
          response: assistantMessage.content || 'Aktion ausgeführt.',
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
