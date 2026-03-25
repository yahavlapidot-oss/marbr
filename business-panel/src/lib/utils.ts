import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Converts a UTC ISO string to the value expected by <input type="datetime-local"> */
export function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

/** Converts a datetime-local input value back to a UTC ISO string */
export function fromDatetimeLocal(local: string): string {
  if (!local) return '';
  // Browsers treat strings without timezone as local time, so new Date() converts correctly
  return new Date(local).toISOString();
}

export function formatCurrency(amount: number, currency = 'ILS') {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency }).format(amount);
}

export function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}
