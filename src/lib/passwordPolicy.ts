/** Password rules for admin accounts, shared by the admin API and the admin screens. */

// Passwords known to be exposed (the VAPT report, PGL-001) can never be used again.
const exposedPasswords = ['paradise@admin123'];

export const passwordHint = 'At least 8 characters, with at least one lowercase letter, one uppercase letter, one number and one symbol.';

/** Returns why a password is not allowed, or null when it is acceptable. */
export const passwordProblem = (password: unknown, _person: { email?: string; name?: string } = {}): string | null => {
  if (typeof password !== 'string' || password.length < 8 || password.length > 256) return 'Use a password of 8 to 256 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Use at least one lowercase letter, one uppercase letter, one number and one symbol.';
  }
  if (exposedPasswords.includes(password.toLowerCase())) return 'This password was exposed in a security report. Choose a different password.';
  if (/(.)\1{3,}/.test(password)) return 'Do not repeat the same character four or more times.';
  return null;
};
