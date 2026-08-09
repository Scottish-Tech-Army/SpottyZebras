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
import { createClient } from '@/lib/supabase'
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
 * Shrinks an image in the browser before upload: scales it down to at most
 * `maxWidth` and re-encodes as JPEG, so a straight-from-phone photo becomes a
 * small, uniform file instead of being rejected by the size cap. Never upscales;
 * falls back to the original file if anything goes wrong.
 */
async function downscaleImage(file: File, maxWidth = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxWidth / bitmap.width)
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

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
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return // guard against Enter-key re-submits while a request is in flight
    setSubmitError(null)

    const all = validateEventForm(values)
    setErrors(all)
    if (Object.keys(all).length > 0) return

    setSubmitting(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) { setSubmitError('Your session has expired. Please log in again.'); return }

      // multipart so the image file rides along with the fields. The image is
      // downscaled in the browser first, so uploads stay small on every device.
      const body = new FormData()
      for (const [k, v] of Object.entries(values)) body.append(k, v)
      if (image) body.append('image', await downscaleImage(image))

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) { router.push('/events'); return }

      // Field-level problems come back keyed by field; everything else is a banner.
      if (res.status === 400 && data.fieldErrors) setErrors(data.fieldErrors)
      setSubmitError(data.error ?? 'Could not create the event. Please try again.')
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
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

        {submitError && (
          <p className="text-sm text-[var(--color-error)]" role="alert">{submitError}</p>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <Button type="button" variant="outline" onClick={() => router.push('/events')} disabled={submitting}>Cancel</Button>
          </div>
          <div className="flex-1">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Creating…
                </span>
              ) : (
                'Create event'
              )}
            </Button>
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
