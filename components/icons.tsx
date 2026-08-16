import type { SVGProps, ReactNode } from 'react'

/**
 * A small, dependency-free icon set — the SVG paths are copied from Lucide
 * (ISC-licensed, https://lucide.dev). We only keep the handful of icons the app
 * actually uses instead of pulling in the whole library.
 *
 * Each icon inherits the current text color (`stroke="currentColor"`) and is sized
 * with a className, e.g. <CalendarDaysIcon className="w-6 h-6" />. Because they're
 * inline SVG they scale crisply on any device and need no network request.
 */

type IconProps = SVGProps<SVGSVGElement>

function SvgIcon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

/** Events */
export const CalendarDaysIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </SvgIcon>
)

/** Attendees (admin) */
export const UsersIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </SvgIcon>
)

/** My bookings (parent) */
export const TicketIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 11v2" />
    <path d="M13 17v2" />
  </SvgIcon>
)

/** Donate */
export const HeartIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </SvgIcon>
)

/** Help */
export const CircleHelpIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </SvgIcon>
)

/** Back chevron */
export const ChevronLeftIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="m15 18-6-6 6-6" />
  </SvgIcon>
)

/** Forward chevron */
export const ChevronRightIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="m9 18 6-6-6-6" />
  </SvgIcon>
)

/** "Today" — a calendar with a dot marking the current day */
export const TodayIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
  </SvgIcon>
)

/** Plus — add / create */
export const PlusIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </SvgIcon>
)

/** Check / tick */
export const CheckIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </SvgIcon>
)

/** Close / clear */
export const XIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </SvgIcon>
)

/** Clock — event time */
export const ClockIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </SvgIcon>
)

/** Map pin — event location */
export const MapPinIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </SvgIcon>
)

/** Image — placeholder when an event has no photo */
export const ImageIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </SvgIcon>
)

/** Single person — avatar fallback */
export const UserIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </SvgIcon>
)

/** Triangle alert — warnings (e.g. the non-refundable notice) */
export const TriangleAlertIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </SvgIcon>
)

/** Phone — contact number */
export const PhoneIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.06 6.06" />
  </SvgIcon>
)

/** Mail — contact email */
export const MailIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.018 0L2 7" />
    <rect x="2" y="4" width="20" height="16" rx="2" />
  </SvgIcon>
)

export const SmileIcon = (p: IconProps) => (
  <SvgIcon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" x2="9.01" y1="9" y2="9" />
    <line x1="15" x2="15.01" y1="9" y2="9" />
  </SvgIcon>
)
