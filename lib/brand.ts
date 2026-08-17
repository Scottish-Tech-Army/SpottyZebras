/**
 * Single source of truth for the charity's brand strings. Import these instead of
 * hardcoding the name/tagline so wording stays consistent everywhere (header, landing
 * page, page metadata, Gift Aid declaration, admin emails).
 *
 * Note: this is text only. Brand *colours* live as CSS variables in globals.css;
 * email HTML that can't use CSS vars still needs literal hexes.
 */
export const BRAND = {
  /** Everyday display name. */
  name: 'Spotty Zebras SCIO',
  /** Playful strapline shown under the logo. */
  tagline: 'Where being different is fun!',
  /** Formal name for legal/HMRC contexts (e.g. the Gift Aid declaration). */
  legalName: 'Spotty Zebras SCIO Charity',
  /** OSCR charity registration number. */
  charityNumber: 'SC053921',
  /** Public contact email */
  email: 'spottyzebras@outlook.com',
  /** Facebook Messenger link (m.me/… or facebook.com/…). Leave '' until available —
   *  the UI hides the Messenger option while this is blank. */
  facebook: '',
  /** One-line description for page metadata / previews. */
  description:
    'A Scottish charity (SCIO) supporting kids with additional support needs and their families through events and activities.',
} as const
