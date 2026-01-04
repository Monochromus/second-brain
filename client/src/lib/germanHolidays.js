// Deutsche Feiertage - berechnet für ein gegebenes Jahr
// Enthält bundesweite Feiertage

/**
 * Berechnet das Osterdatum nach der Gaußschen Osterformel
 * @param {number} year - Das Jahr
 * @returns {Date} - Ostersonntag
 */
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Fügt Tage zu einem Datum hinzu
 * @param {Date} date - Ausgangsdatum
 * @param {number} days - Anzahl der Tage
 * @returns {Date} - Neues Datum
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Formatiert ein Datum als ISO-String (nur Datum)
 * @param {Date} date - Das Datum
 * @returns {string} - ISO-Datumstring (YYYY-MM-DD)
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Generiert alle deutschen Feiertage für ein Jahr
 * @param {number} year - Das Jahr
 * @returns {Array} - Array von Feiertag-Events
 */
export function getGermanHolidays(year) {
  const easter = calculateEaster(year);

  const holidays = [
    // Feste Feiertage
    { name: 'Neujahr', date: new Date(year, 0, 1) },
    { name: 'Heilige Drei Könige', date: new Date(year, 0, 6) },
    { name: 'Tag der Arbeit', date: new Date(year, 4, 1) },
    { name: 'Tag der Deutschen Einheit', date: new Date(year, 9, 3) },
    { name: 'Allerheiligen', date: new Date(year, 10, 1) },
    { name: '1. Weihnachtstag', date: new Date(year, 11, 25) },
    { name: '2. Weihnachtstag', date: new Date(year, 11, 26) },
    { name: 'Silvester', date: new Date(year, 11, 31) },

    // Bewegliche Feiertage (abhängig von Ostern)
    { name: 'Karfreitag', date: addDays(easter, -2) },
    { name: 'Ostersonntag', date: easter },
    { name: 'Ostermontag', date: addDays(easter, 1) },
    { name: 'Christi Himmelfahrt', date: addDays(easter, 39) },
    { name: 'Pfingstsonntag', date: addDays(easter, 49) },
    { name: 'Pfingstmontag', date: addDays(easter, 50) },
    { name: 'Fronleichnam', date: addDays(easter, 60) },
  ];

  // Konvertiere zu Event-Format
  return holidays.map((holiday, index) => ({
    id: `holiday-${year}-${index}`,
    title: holiday.name,
    start_time: formatDate(holiday.date) + 'T00:00:00',
    end_time: formatDate(holiday.date) + 'T23:59:59',
    is_all_day: 1,
    calendar_id: 'holidays',
    calendar_source: 'holidays',
    color: '#EF4444', // Rot für Feiertage
    is_holiday: true
  }));
}

/**
 * Generiert Feiertage für einen Datumsbereich
 * @param {string} startDate - Start (YYYY-MM-DD)
 * @param {string} endDate - Ende (YYYY-MM-DD)
 * @returns {Array} - Array von Feiertag-Events im Bereich
 */
export function getHolidaysInRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  let allHolidays = [];

  // Hole Feiertage für alle betroffenen Jahre
  for (let year = startYear; year <= endYear; year++) {
    allHolidays = allHolidays.concat(getGermanHolidays(year));
  }

  // Filtere auf den Bereich
  return allHolidays.filter(holiday => {
    const holidayDate = new Date(holiday.start_time);
    return holidayDate >= start && holidayDate <= end;
  });
}

// Feiertags-Kalender Metadaten
export const HOLIDAYS_CALENDAR = {
  id: 'holidays',
  name: 'Deutsche Feiertage',
  color: '#EF4444',
  provider: 'holidays',
  is_active: true
};
