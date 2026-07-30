type DateTimeValue = string | number | Date;

export function formatMoney(amount: string | number, currency: string): string {
  //Intl is JavaScript’s built-in internationalization API. It formats values according to locale and regional conventions.
  //formatMoney('1234.5', 'THB') ==> "฿1,234.50"
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

export function formatDateTime(value: DateTimeValue): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatOptionalDateTime(
  value: DateTimeValue | null,
  fallback = 'Not scheduled',
): string {
  return value ? formatDateTime(value) : fallback;
}

export function formatCompactDateTime(value: DateTimeValue): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
