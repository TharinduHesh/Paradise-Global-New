/** Password rules for admin accounts, shared by the admin API and the admin screens. */

// Company names and words that appear in guessable admin passwords such as "Paradise@Admin123".
const blockedWords = ['paradise', 'leisure', 'admin', 'password', 'welcome', 'qwerty', 'letmein', 'iloveyou', '123456', 'abc123'];

export const passwordHint = 'At least 12 characters, using three of: lowercase, uppercase, numbers, symbols. Do not use the company name, "admin", your name or email.';

/** Returns why a password is not allowed, or null when it is acceptable. */
export const passwordProblem = (password: unknown, person: { email?: string; name?: string } = {}): string | null => {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) return 'Use a password of 12 to 256 characters.';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  if (kinds < 3) return 'Use at least three of: lowercase letters, uppercase letters, numbers and symbols.';
  const lower = password.toLowerCase();
  // Catch common substitutions such as "P@r4d1se" or "@dm1n".
  const plain = lower.replace(/[@4]/g, 'a').replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[$5]/g, 's');
  const personal = [person.email?.split('@')[0], ...(person.name?.split(/\s+/) ?? [])]
    .filter((word): word is string => Boolean(word && word.length >= 3)).map((word) => word.toLowerCase());
  if ([...blockedWords, ...personal].some((word) => lower.includes(word) || plain.includes(word))) {
    return 'The password is too easy to guess. Do not use the company name, words like "admin" or "password", your name or email.';
  }
  if (/(.)\1{3,}/.test(password)) return 'Do not repeat the same character four or more times.';
  return null;
};
