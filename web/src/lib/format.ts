// Dates are stored as UTC calendar days, so format them in UTC to avoid off-by-one days.
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const numberFormatter = new Intl.NumberFormat('en-US');

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));
export const formatNumber = (value: number) => numberFormatter.format(value);

/** Today as YYYY-MM-DD (UTC), for date inputs. */
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function initials(name: string) {
  return name
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
