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
  /** Public contact phone 07827223415*/
  phone: '+44 7827 223415',
  /** Correspondence address */
  address: '41 Peggishill road, Ayrshire, KA73RD',
  /** Named people to reach the charity on — shown on the logged-in Help page. */
  contacts: {
    primary: { name: 'Ciara McDonald', phone: '+44 07827 223415' },
    secondary: { name: 'Lynsi Alexander', phone: '+44 07792 238428' },
  },
  /** One-line description for page metadata / previews. */
  description:
    'A Scottish charity (SCIO) supporting kids with additional support needs and their families through events and activities.',
} as const
