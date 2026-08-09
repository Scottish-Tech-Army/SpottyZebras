'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormSection } from '@/components/ui/FormSection'
import { TextField } from '@/components/ui/TextField'
import DateField from '@/components/signup/DateField'
import { ImageIcon, XIcon } from '@/components/icons'
import { useAppChrome } from '@/components/AppUserContext'
import {
  type EventFormValues, type EventFormErrors,
  REQUIRED_FIELDS, sanitizeEventField, validateEventForm, minEventDate,
} from '@/lib/events/newEventForm'

const EMPTY: EventFormValues = {
  title: '', description: '', date: '', startTime: '', endTime: '',
  location: '', ageMin: '', ageMax: '', capacity: '', price: '',
}

const REQUIRED = new Set<keyof EventFormValues>(REQUIRED_FIELDS)

/**
 * Admin-only "create event" form. Lives under /events so the app shell keeps the
 * Events tab active and its nav mounted; the back chevron returns to the calendar.
 *
 * NOTE: submission isn't wired yet — this validates then logs the draft. The API
 * step will upload the image, combine the date + times into `Europe/London`
 * timestamptz values, and POST to the `event` table.
 */
export default function NewEventPage() {
  const router = useRouter()
  const { role } = useAppChrome()

  // Parents shouldn't reach this screen; the API/RLS will enforce it too.
  useEffect(() => {
    if (role && role !== 'admin') router.replace('/events')
  }, [role, router])

  const [values, setValues] = useState<EventFormValues>(EMPTY)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [image, setImage] = useState<File | null>(null)

  // "*" markers come from the same list the validator uses, so they can't drift.
  const req = (f: keyof EventFormValues) => (REQUIRED.has(f) ? ' *' : '')

  function set(field: keyof EventFormValues, raw: string) {
    setValues(v => ({ ...v, [field]: sanitizeEventField(field, raw) }))
  }

  // On blur, refresh just this field's error so messages appear as you go.
  function blur(field: keyof EventFormValues) {
    const all = validateEventForm(values)
    setErrors(prev => ({ ...prev, [field]: all[field] }))
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const all = validateEventForm(values)
    setErrors(all)
    if (Object.keys(all).length > 0) return

    // TODO(api): upload `image`, build Europe/London instants from date + times,
    // map to the `event` columns, and POST. For now just capture the draft.
    const draft = {
      ...values,
      ageMin: values.ageMin ? Number(values.ageMin) : null,
      ageMax: values.ageMax ? Number(values.ageMax) : null,
      capacity: values.capacity ? Number(values.capacity) : null, // empty = open to all
      price: values.price ? Number(values.price) : 0,
      imageName: image?.name ?? null,
    }
    console.log('New event draft', draft)
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6 lg:p-10">
      <div className="mb-6 flex items-center gap-2">
        <BackButton href="/events" />
        <h1 className="text-2xl font-bold text-[var(--color-secondary)]">New event</h1>
      </div>

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <FormSection label="Details" tone="secondary">
          <TextField
            label={`Title${req('title')}`}
            value={values.title}
            onChange={v => set('title', v)}
            onBlur={() => blur('title')}
            error={errors.title}
            placeholder="e.g. Messy art afternoon"
          />
          <TextArea
            label={`Description${req('description')}`}
            value={values.description}
            onChange={v => set('description', v)}
            onBlur={() => blur('description')}
            error={errors.description}
            placeholder="What happens at this event?"
          />
        </FormSection>

        <FormSection label="Date & time" tone="secondary">
          <DateField
            label={`Date${req('date')}`}
            value={values.date}
            onChange={v => set('date', v)}
            onBlur={() => blur('date')}
            error={errors.date}
            min={minEventDate()}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={`Start time${req('startTime')}`}
              type="time"
              value={values.startTime}
              onChange={v => set('startTime', v)}
              onBlur={() => blur('startTime')}
              error={errors.startTime}
            />
            <TextField
              label="End time"
              type="time"
              value={values.endTime}
              onChange={v => set('endTime', v)}
              onBlur={() => blur('endTime')}
              error={errors.endTime}
            />
          </div>
        </FormSection>

        <FormSection label="Location & audience" tone="secondary">
          <TextField
            label={`Location${req('location')}`}
            value={values.location}
            onChange={v => set('location', v)}
            onBlur={() => blur('location')}
            error={errors.location}
            placeholder="e.g. Kelvingrove Park"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Minimum age" type="number" value={values.ageMin} onChange={v => set('ageMin', v)} placeholder="0" hint="Leave blank for all ages" />
            <TextField label="Maximum age" type="number" value={values.ageMax} onChange={v => set('ageMax', v)} onBlur={() => blur('ageMax')} error={errors.ageMax} placeholder="18" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Capacity" type="number" value={values.capacity} onChange={v => set('capacity', v)} placeholder="20" hint="Leave blank for no limit" />
            <TextField label="Price" type="number" prefix="£" value={values.price} onChange={v => set('price', v)} placeholder="0" hint="Leave 0 for a free event" />
          </div>
        </FormSection>

        <FormSection label="Image" tone="secondary">
          <ImageUpload file={image} onChange={setImage} />
        </FormSection>

        <div className="flex gap-3">
          <div className="flex-1">
            <Button type="button" variant="outline" onClick={() => router.push('/events')}>Cancel</Button>
          </div>
          <div className="flex-1">
            <Button type="submit">Create event</Button>
          </div>
        </div>
        </form>
      </Card>
    </div>
  )
}

/** Multi-line field, styled to match TextField (which is single-line only). */
function TextArea({
  label, value, onChange, onBlur, error, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string
  placeholder?: string
}) {
  const borderClass = error ? 'border-[var(--color-error)]' : 'border-[var(--color-border-input)]'
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={4}
        className={`w-full resize-y rounded-[var(--radius-sm)] border bg-white px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] ${borderClass}`}
      />
      {error && <p className="mt-1 text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  )
}

/** Image picker with a preview. Holds the File locally; upload happens on submit
 *  (API step). Landscape 16:9 is recommended to match how event cards crop. */
function ImageUpload({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  // Derive the preview URL from the file (no state), and revoke it on change/unmount.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Event image</label>
      {preview ? (
        <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-input)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected event" className="aspect-[16/9] w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove image"
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-[var(--color-text)] shadow transition hover:bg-white"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-input)] bg-white px-4 py-8 text-center text-[var(--color-text-muted)] transition hover:bg-[var(--color-sand)]">
          <ImageIcon className="h-6 w-6" />
          <span className="text-sm font-medium">Tap to upload an image</span>
          <span className="text-xs">Landscape (16:9) works best</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  )
}
