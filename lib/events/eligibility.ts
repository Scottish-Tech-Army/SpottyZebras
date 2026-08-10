/**
 * Whether a child's age falls within an event's age range. A null bound means
 * "open" on that end (blank age range = all ages). Used by the RSVP dialog to
 * enable/disable a child, and re-checked server-side on booking.
 */
export function isAgeEligible(age: number, min: number | null, max: number | null): boolean {
  if (min != null && age < min) return false
  if (max != null && age > max) return false
  return true
}
