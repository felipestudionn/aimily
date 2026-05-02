/**
 * Disposable email domain blocklist.
 *
 * Validated client-side at the signup form so users with throwaway
 * inboxes (mailinator, tempmail, guerrillamail…) get a clear error
 * before the account is created. This is one layer in our anti-bot
 * stack — the others are: email-confirmation required, Supabase Auth
 * IP rate limit (4 emails/hour), and per-user AI rate limit. None of
 * these add friction to a legitimate user with a real address.
 *
 * Curated from the top 50 most-abused providers on the public
 * disposable-email-domains list. Add more as we see them in the wild.
 * Keep it < 200 entries — over that, the linear scan starts to matter
 * on signup pageload.
 */
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  // Mailinator family
  'mailinator.com', 'mailinator.net', 'mailinator2.com', 'mailinator.org',
  'reallymymail.com', 'sogetthis.com', 'mailmetrash.com',
  // 10minutemail family
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail.co.uk',
  '20minutemail.com', '30minutemail.com',
  // Temp-mail / TempMail
  'temp-mail.org', 'temp-mail.io', 'tempmail.com', 'tempmail.io', 'tempmail.net',
  'tempmail.us.com', 'tempmailaddress.com', 'tempmaill.com', 'tempinbox.com',
  // Guerrilla
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'guerrillamail.info', 'guerrillamail.de', 'sharklasers.com', 'grr.la',
  'spam4.me', 'pokemail.net',
  // Throwaway / yopmail / dropmail
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'dropmail.me', 'throwawaymail.com', 'trashmail.com',
  'trashmail.net', 'trashmail.io', 'trashmail.de', 'binkmail.com',
  // Disposable specifically common in fashion/e-commerce abuse
  'maildrop.cc', 'discardmail.com', 'getairmail.com', 'fakeinbox.com',
  'fakemail.fr', 'mintemail.com', 'mohmal.com', 'mailcatch.com',
  // Russian disposable
  'mail-temp.com', 'tempmail.ru', 'inbox.lt',
  // Misc
  'dispostable.com', 'mytrashmail.com', 'mytemp.email', 'spambox.us',
  'spamfree24.org', 'spamgourmet.com', 'mvrht.com', 'fastmail.cn',
  'emailtemp.org', 'sneakemail.com', 'cool-email.com', 'meltmail.com',
]);

const COMMON_FREE_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.es', 'yahoo.fr',
  'hotmail.com', 'hotmail.es', 'hotmail.co.uk', 'hotmail.fr',
  'outlook.com', 'outlook.es', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'gmx.com', 'gmx.net', 'aol.com',
  'mail.com', 'zoho.com', 'fastmail.com', 'tutanota.com',
]);

export interface EmailValidationResult {
  ok: boolean;
  reason?: 'invalid_format' | 'disposable_domain';
}

/**
 * Validates an email address for signup. Cheap regex sanity check + block
 * against known disposable providers. Common free providers (gmail/yahoo/
 * outlook…) pass through cleanly — we don't penalise users who don't have
 * a corporate address.
 */
export function validateSignupEmail(email: string): EmailValidationResult {
  if (typeof email !== 'string') return { ok: false, reason: 'invalid_format' };
  const trimmed = email.trim().toLowerCase();
  // Basic structural check — anchored, with at least one dot in the domain.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, reason: 'invalid_format' };
  }
  const domain = trimmed.split('@')[1];
  if (!domain) return { ok: false, reason: 'invalid_format' };
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, reason: 'disposable_domain' };
  }
  return { ok: true };
}

/** Convenience used by analytics / future stats — does NOT gate signup. */
export function isCommonFreeDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  return domain ? COMMON_FREE_DOMAINS.has(domain) : false;
}
