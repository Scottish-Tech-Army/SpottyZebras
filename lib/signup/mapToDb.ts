import type { Carer, Child, SignupData, ParentProfileRow, ChildRow } from './types'
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
    address_line_1: t(c1.line1),
    address_line_2: orNull(c1.line2),
    town: orNull(c1.city),
    postcode: t(c1.postcode),

    second_carer_name: c2 ? orNull(c2.fullName) : null,
    second_carer_email: c2 ? emailOrNull(c2.email) : null,
    second_carer_phone: c2 && t(c2.phone) ? e164(c2.phone) : null,
    second_carer_address_line_1: c2 ? orNull(c2.line1) : null,
    second_carer_address_line_2: c2 ? orNull(c2.line2) : null,
    second_carer_town: c2 ? orNull(c2.city) : null,
    second_carer_postcode: c2 ? orNull(c2.postcode) : null,

    emergency_contact_name: t(data.emergency.name),
    emergency_contact_phone: e164(data.emergency.phone),
    referral_source: orNull(data.referralSource),
  }
}

/**
 * Each child becomes a row. When the child shares carer 1's address we COPY that
 * address onto the row rather than leaving it NULL, so every child row is
 * self-contained and queries never need to fall back to the parent.
 */
export function toChildRows(data: SignupData): ChildRow[] {
  const c1 = data.carer1

  return data.children.map((child: Child) => {
    const addr = child.sameAddressAsCarer1 ? c1 : child

    return {
      full_name: t(child.name),
      date_of_birth: t(child.dob),           // already ISO yyyy-mm-dd
      address_line_1: orNull(addr.line1),
      address_line_2: orNull(addr.line2),
      town: orNull(addr.city),
      postcode: orNull(addr.postcode),
      additional_support_needs: orNull(child.supportNeeds),
      allergies: orNull(child.allergies),
      photo_consent: child.photoConsent,
    }
  })
}
