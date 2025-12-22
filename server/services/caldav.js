const { createDAVClient } = require('tsdav');

async function createClient(connection) {
  if (!connection.calendar_url || !connection.credentials) {
    return null;
  }

  let credentials;
  try {
    credentials = JSON.parse(connection.credentials);
  } catch {
    return null;
  }

  const serverUrl = connection.provider === 'icloud'
    ? 'https://caldav.icloud.com'
    : 'https://outlook.office365.com/caldav';

  try {
    const client = await createDAVClient({
      serverUrl,
      credentials: {
        username: credentials.username,
        password: credentials.password
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav'
    });

    return client;
  } catch (error) {
    console.error(`Failed to create CalDAV client for ${connection.provider}:`, error.message);
    return null;
  }
}

async function fetchCalendarEvents(client, calendarUrl, startDate, endDate) {
  if (!client) {
    return [];
  }

  try {
    const calendars = await client.fetchCalendars();

    if (!calendars || calendars.length === 0) {
      return [];
    }

    const events = [];

    for (const calendar of calendars) {
      try {
        const calendarObjects = await client.fetchCalendarObjects({
          calendar,
          timeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        });

        for (const obj of calendarObjects) {
          const parsed = parseICalEvent(obj.data, calendar.displayName);
          if (parsed) {
            events.push({
              ...parsed,
              external_id: obj.url || obj.etag
            });
          }
        }
      } catch (calError) {
        console.error(`Error fetching from calendar ${calendar.displayName}:`, calError.message);
      }
    }

    return events;
  } catch (error) {
    console.error('Error fetching calendar events:', error.message);
    return [];
  }
}

function parseICalEvent(icalData, calendarName) {
  if (!icalData) return null;

  try {
    const lines = icalData.split('\n').map(l => l.trim());
    const event = {};

    let inEvent = false;

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        continue;
      }
      if (line === 'END:VEVENT') {
        break;
      }
      if (!inEvent) continue;

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      let key = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 1);

      const semiIndex = key.indexOf(';');
      if (semiIndex !== -1) {
        key = key.substring(0, semiIndex);
      }

      switch (key) {
        case 'SUMMARY':
          event.title = value;
          break;
        case 'DESCRIPTION':
          event.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
          break;
        case 'DTSTART':
          event.start_time = parseICalDate(value);
          event.is_all_day = value.length === 8;
          break;
        case 'DTEND':
          event.end_time = parseICalDate(value);
          break;
        case 'LOCATION':
          event.location = value;
          break;
        case 'UID':
          event.uid = value;
          break;
      }
    }

    if (event.title && event.start_time) {
      if (!event.end_time) {
        const start = new Date(event.start_time);
        start.setHours(start.getHours() + 1);
        event.end_time = start.toISOString();
      }
      return event;
    }

    return null;
  } catch (error) {
    console.error('Error parsing iCal event:', error.message);
    return null;
  }
}

function parseICalDate(dateStr) {
  if (!dateStr) return null;

  dateStr = dateStr.replace(/[TZ]/g, '');

  if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  if (dateStr.length >= 14) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  }

  return null;
}

async function createCalendarEvent(client, calendarUrl, event) {
  if (!client) {
    throw new Error('CalDAV client not initialized');
  }

  try {
    const calendars = await client.fetchCalendars();
    if (!calendars || calendars.length === 0) {
      throw new Error('No calendars found');
    }

    const calendar = calendars[0];
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@secondbrain`;

    const icalEvent = generateICalEvent({
      ...event,
      uid
    });

    await client.createCalendarObject({
      calendar,
      filename: `${uid}.ics`,
      iCalString: icalEvent
    });

    return { success: true, uid };
  } catch (error) {
    console.error('Error creating calendar event:', error.message);
    throw error;
  }
}

function generateICalEvent(event) {
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Second Brain//EN',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(event.start_time)}`,
    `DTEND:${formatDate(event.end_time)}`,
    `SUMMARY:${event.title}`
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n').replace(/,/g, '\\,')}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${event.location}`);
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

module.exports = {
  createClient,
  fetchCalendarEvents,
  createCalendarEvent,
  parseICalEvent,
  parseICalDate
};
