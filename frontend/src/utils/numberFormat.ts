const CURRENCY_FORMATTER = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FLEX_FORMATTER = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatAmountFR(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return '—';
  return CURRENCY_FORMATTER.format(num);
}

export function formatNumberFR(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return '—';
  return FLEX_FORMATTER.format(num);
}

export function formatPercentageFR(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return '—';
  const rounded = Math.round(num * 100) / 100;
  return String(rounded).replace('.', ',');
}

export function formatDateFR(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_FORMATTER.format(date);
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}