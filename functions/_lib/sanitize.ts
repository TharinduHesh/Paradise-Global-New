/** Input clean-up shared by the public form endpoints (/api/contact and /api/reviews). */

/* oxlint-disable no-control-regex -- these patterns exist to strip or reject control characters. */
/** Single-line fields: control characters (including CR/LF, which could inject email headers) become spaces. */
export const singleLine = (value: string) => value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
/** Multi-line text keeps its line breaks and tabs; other control characters are removed. */
export const multiLine = (value: string) => value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
/** A plain address with no spaces, control characters, quotes or angle brackets, so it is safe as a reply-to. */
export const EMAIL = /^[^\s@<>()[\]\\,;:"\u0000-\u001f\u007f]+@[^\s@<>()[\]\\,;:"\u0000-\u001f\u007f]+\.[^\s@<>()[\]\\,;:"\u0000-\u001f\u007f]{2,}$/u;
/* oxlint-enable no-control-regex */

/** Removes markup-looking tags and collapses runs of blank lines; React and the email templates still escape on output. */
export const stripTags = (value: string) => value.replace(/<\/?[a-z][^>]*>/gi, '').replace(/\n{3,}/g, '\n\n').trim();
