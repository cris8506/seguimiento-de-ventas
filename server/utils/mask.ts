/**
 * Masks email for privacy (e.g., j***n@gmail.com or j***@domain.com)
 */
export function maskEmail(email?: string): string {
  if (!email || typeof email !== 'string') return '-';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [user, domain] = parts;
  if (user.length <= 2) {
    return `${user[0] || '*'}***@${domain}`;
  }
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Masks phone number for privacy (e.g., +57 *** *** 1234)
 */
export function maskPhone(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '-';
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return '***';
  const lastFour = cleaned.slice(-4);
  const prefix = cleaned.slice(0, 3);
  return `${prefix} *** *** ${lastFour}`;
}
