/** Password rules for admin accounts, shared by the admin API and the admin screens. */

// Passwords known to be exposed (the VAPT report, PGL-001) can never be used again.
const exposedPasswords = ['paradise@admin123'];

export const passwordHint = 'At least 12 characters, using three of: lowercase, uppercase, numbers, symbols.';

/** Returns why a password is not allowed, or null when it is acceptable. */
export const passwordProblem = (password: unknown, _person: { email?: string; name?: string } = {}): string | null => {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) return 'Use a password of 12 to 256 characters.';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  if (kinds < 3) return 'Use at least three of: lowercase letters, uppercase letters, numbers and symbols.';
  if (exposedPasswords.includes(password.toLowerCase())) return 'This password was exposed in a security report. Choose a different password.';
  if (/(.)\1{3,}/.test(password)) return 'Do not repeat the same character four or more times.';
  return null;
};
