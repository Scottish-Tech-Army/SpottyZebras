import EventCalendar from '@/components/events/EventCalendar'

export default function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-10">
      <h1 className="mb-4 text-2xl font-bold text-[var(--color-secondary)]">Events</h1>
      <EventCalendar />
    </div>
  )
}
