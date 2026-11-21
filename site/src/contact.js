/**
 * How people reach the Celebrate team. Used by "Forgot your password?" on the vendor sign-in.
 * Put the team's support email address here. While it is empty, the page asks vendors to
 * contact the team but shows no address.
 */
export const SUPPORT_EMAIL = "";

/** A mailto: link with the subject and a short form already filled in. */
export const supportMail = (subject, body) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
