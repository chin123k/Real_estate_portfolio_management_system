// Utility for formatting INR currency amounts with Indian numbering format

/**
 * Format a numeric INR amount using Indian numbering format and currency.
 * Displays amounts like: ₹12,45,000.00
 */
export function formatInr(amountInr: number | string | null | undefined): string {
  const n = Number(amountInr ?? 0);
  const formatter = new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 2 
  });
  return formatter.format(isFinite(n) ? n : 0);
}

/**
 * Format a numeric currency amount (alias for formatInr)
 * Displays amounts like: ₹12,45,000.00
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  return formatInr(amount);
}
