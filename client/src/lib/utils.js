import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date, formatStr = 'dd.MM.yyyy') {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: de });
}

export function formatTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm', { locale: de });
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd.MM.yyyy, HH:mm', { locale: de });
}

export function formatRelativeDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) return 'Heute';
  if (isTomorrow(d)) return 'Morgen';
  if (isThisWeek(d)) return format(d, 'EEEE', { locale: de });

  return format(d, 'dd.MM.yyyy', { locale: de });
}

export function formatTimeAgo(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: de });
}

export function getPriorityColor(priority) {
  switch (priority) {
    case 1:
      return 'text-red-600 dark:text-red-400';
    case 2:
      return 'text-orange-600 dark:text-orange-400';
    case 3:
      return 'text-yellow-600 dark:text-yellow-400';
    case 4:
      return 'text-blue-600 dark:text-blue-400';
    case 5:
      return 'text-gray-500 dark:text-gray-400';
    default:
      return 'text-gray-500';
  }
}

export function getPriorityLabel(priority) {
  switch (priority) {
    case 1:
      return 'Sehr hoch';
    case 2:
      return 'Hoch';
    case 3:
      return 'Mittel';
    case 4:
      return 'Niedrig';
    case 5:
      return 'Sehr niedrig';
    default:
      return 'Normal';
  }
}

export function getPriorityBgColor(priority) {
  switch (priority) {
    case 1:
      return 'bg-red-100 dark:bg-red-900/30';
    case 2:
      return 'bg-orange-100 dark:bg-orange-900/30';
    case 3:
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    case 4:
      return 'bg-blue-100 dark:bg-blue-900/30';
    case 5:
      return 'bg-gray-100 dark:bg-gray-800';
    default:
      return 'bg-gray-100 dark:bg-gray-800';
  }
}

export function getStatusLabel(status) {
  switch (status) {
    case 'open':
      return 'Offen';
    case 'in_progress':
      return 'In Bearbeitung';
    case 'done':
      return 'Erledigt';
    case 'cancelled':
      return 'Abgebrochen';
    default:
      return status;
  }
}

export function getStatusColor(status) {
  switch (status) {
    case 'open':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    case 'in_progress':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'done':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'cancelled':
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function truncate(str, length = 100) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    (groups[value] = groups[value] || []).push(item);
    return groups;
  }, {});
}

export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
