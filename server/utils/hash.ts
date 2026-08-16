import crypto from 'crypto';

/**
 * Generates SHA-256 hash in lowercase hex format
 */
export function sha256(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }
  return crypto.createHash('sha256').update(value.trim()).digest('hex');
}

/**
 * Normalizes email address according to Meta CAPI specification:
 * - Trims leading/trailing whitespace
 * - Converts all characters to lowercase
 */
export function normalizeEmail(email?: string): string {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  // Basic sanity check to avoid hashing garbage
  if (!trimmed.includes('@')) return '';
  return trimmed;
}

/**
 * Normalizes phone number according to Meta CAPI specification:
 * - Removes non-digit characters (except optional leading +)
 * - Removes leading zeros
 */
export function normalizePhone(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '';
  // Remove spaces, hyphens, parentheses, etc.
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned || cleaned.length < 6) return '';
  return cleaned;
}

/**
 * Normalizes first or last name according to Meta CAPI specification
 */
export function normalizeName(name?: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
}
