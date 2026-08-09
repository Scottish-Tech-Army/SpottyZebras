import EventsHeader from '@/components/events/EventsHeader'
import EventCalendar from '@/components/events/EventCalendar'

export default function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-10">
      <EventsHeader />
      <EventCalendar />
    </div>
  )
}
