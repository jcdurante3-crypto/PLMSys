/**
 * Formats a raw string into standard Job Order format: 4 digits, dash, 2 digits (e.g., 0000-00)
 */
export function formatJobOrder(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 4) {
    return digits;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
}

/**
 * Checks whether a string strictly matches the 4 digits - 2 digits Job Order pattern (e.g. 0000-00)
 */
export function isValidJobOrder(val: string): boolean {
  return /^\d{4}-\d{2}$/.test(val.trim());
}
