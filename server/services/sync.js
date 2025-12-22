const db = require('../config/database');
const { createClient, fetchCalendarEvents } = require('./caldav');

async function syncCalendar(userId) {
  const connections = db.prepare(`
    SELECT * FROM calendar_connections
    WHERE user_id = ? AND is_active = 1
  `).all(userId);

  if (connections.length === 0) {
    return { message: 'Keine aktiven Kalenderverbindungen gefunden.', synced: 0 };
  }

  let totalSynced = 0;
  const errors = [];

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);

  for (const connection of connections) {
    try {
      const client = await createClient(connection);

      if (!client) {
        errors.push(`Verbindung zu ${connection.provider} konnte nicht hergestellt werden.`);
        continue;
      }

      const events = await fetchCalendarEvents(client, connection.calendar_url, startDate, endDate);

      const deleteStmt = db.prepare(`
        DELETE FROM calendar_events
        WHERE user_id = ? AND calendar_source = ?
      `);

      const insertStmt = db.prepare(`
        INSERT INTO calendar_events (user_id, external_id, calendar_source, title, description, start_time, end_time, location, is_all_day, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const syncEvents = db.transaction((events) => {
        deleteStmt.run(userId, connection.provider);

        for (const event of events) {
          insertStmt.run(
            userId,
            event.external_id || event.uid,
            connection.provider,
            event.title,
            event.description || null,
            event.start_time,
            event.end_time,
            event.location || null,
            event.is_all_day ? 1 : 0
          );
        }
      });

      syncEvents(events);

      db.prepare(`
        UPDATE calendar_connections SET last_sync = CURRENT_TIMESTAMP WHERE id = ?
      `).run(connection.id);

      totalSynced += events.length;
    } catch (error) {
      console.error(`Sync error for ${connection.provider}:`, error);
      errors.push(`Fehler bei ${connection.provider}: ${error.message}`);
    }
  }

  return {
    message: errors.length > 0
      ? `Synchronisation mit Fehlern abgeschlossen.`
      : `Synchronisation erfolgreich.`,
    synced: totalSynced,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function createMockEvents(userId) {
  const existingEvents = db.prepare('SELECT COUNT(*) as count FROM calendar_events WHERE user_id = ?')
    .get(userId);

  if (existingEvents.count > 0) {
    return;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const mockEvents = [
    {
      title: 'Team Meeting',
      description: 'Wöchentliches Team-Standup',
      start_time: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 11 * 60 * 60 * 1000).toISOString(),
      location: 'Konferenzraum A',
      calendar_source: 'local'
    },
    {
      title: 'Projektreview',
      description: 'Quartalsreview mit Stakeholdern',
      start_time: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 15.5 * 60 * 60 * 1000).toISOString(),
      location: 'Online (Zoom)',
      calendar_source: 'local'
    },
    {
      title: 'Lunch mit Markus',
      start_time: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 13 * 60 * 60 * 1000).toISOString(),
      location: 'Café Milano',
      calendar_source: 'local'
    },
    {
      title: 'Arzttermin',
      start_time: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(),
      location: 'Praxis Dr. Müller',
      calendar_source: 'local'
    },
    {
      title: 'Sprint Planning',
      description: 'Planung für Sprint 12',
      start_time: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString(),
      calendar_source: 'local'
    },
    {
      title: 'Geburtstag Anna',
      start_time: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString(),
      is_all_day: true,
      calendar_source: 'local'
    },
    {
      title: 'Workshop: Design Thinking',
      description: 'Ganztägiger Workshop zum Thema Design Thinking',
      start_time: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000).toISOString(),
      location: 'Hauptgebäude, Raum 301',
      calendar_source: 'local'
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO calendar_events (user_id, title, description, start_time, end_time, location, is_all_day, calendar_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction((events) => {
    for (const event of events) {
      stmt.run(
        userId,
        event.title,
        event.description || null,
        event.start_time,
        event.end_time,
        event.location || null,
        event.is_all_day ? 1 : 0,
        event.calendar_source
      );
    }
  });

  insertAll(mockEvents);
}

module.exports = {
  syncCalendar,
  createMockEvents
};
