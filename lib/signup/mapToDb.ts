import type { Carer, SignupData, ParentProfileRow } from './types'
import { isCarerEmpty } from './validation'

const t = (v: string) => v.trim()
/** national digits → E.164, e.g. "7123456789" → "+447123456789" */
const e164 = (national: string) => (t(national) ? `+44${t(national)}` : '')
/** optional column: empty string becomes NULL rather than "" */
const orNull = (v: string) => (t(v) ? t(v) : null)
/** emails are stored lower-cased so they compare/dedupe reliably */
const emailOrNull = (v: string) => (t(v) ? t(v).toLowerCase() : null)

/**
 * The login email IS the parent's email — auth.users holds it for sign-in and
 * parent_profile stores it for contact. Single source: carer 1's email.
 */
export const loginEmailFor = (data: SignupData) => t(data.carer1.email).toLowerCase()

/** A second carer with nothing (or only whitespace) in it is treated as absent. */
export const effectiveCarer2 = (carer2: Carer | null): Carer | null =>
  carer2 && !isCarerEmpty(carer2) ? carer2 : null

/**
 * Maps the wizard's UI shape onto the flat parent_profile row (which repeats the
 * carer columns with a `second_carer_` prefix). Everything is trimmed here, so the
 * DB never sees stray whitespace even if the UI missed it.
 */
export function toParentProfileRow(data: SignupData): ParentProfileRow {
  const c1 = data.carer1
  const c2 = effectiveCarer2(data.carer2)

  return {
    full_name: t(c1.fullName),
    email: loginEmailFor(data),
    phone: e164(c1.phone),
    address_line1: t(c1.line1),
    address_line2: orNull(c1.line2),
    city: orNull(c1.city),
    postcode: t(c1.postcode),

    second_carer_full_name: c2 ? t(c2.fullName) : null,
    second_carer_email: c2 ? emailOrNull(c2.email) : null,
    second_carer_phone: c2 && t(c2.phone) ? e164(c2.phone) : null,
    second_carer_address_line1: c2 ? orNull(c2.line1) : null,
    second_carer_address_line2: c2 ? orNull(c2.line2) : null,
    second_carer_city: c2 ? orNull(c2.city) : null,
    second_carer_postcode: c2 ? orNull(c2.postcode) : null,

    emergency_contact_name: t(data.emergency.name),
    emergency_contact_phone: e164(data.emergency.phone),
  }
}
