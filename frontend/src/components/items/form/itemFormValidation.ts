import dayjs from 'dayjs'
import type { Item, ItemInput, UploadedImage } from '../../../types/item'

export type ItemFormErrors = Partial<Record<keyof ItemInput, string>>

export const createEmptyItemInput = (): ItemInput => ({
  type: 'lost',
  title: '',
  description: '',
  category: 'other',
  location: '',
  occurred_at: dayjs().second(0).millisecond(0).toISOString(),
  contact_name: '',
  contact_info: '',
  image_key: null,
  status: 'open',
})

/** The editable fields of an existing item, as the form's initial values. */
export const itemToInput = ({
  id: _id,
  image_url: _i,
  created_at: _c,
  updated_at: _u,
  resolved_by: _rb,
  resolution_note: _rn,
  resolved_at: _ra,
  ...input
}: Item): ItemInput => input

/** The item's current photo, as the form's initial image. */
export const itemImage = (item: Item): UploadedImage | null =>
  item.image_key && item.image_url ? { key: item.image_key, url: item.image_url } : null

export function validateItemInput(values: ItemInput, now = dayjs()): ItemFormErrors {
  const errors: ItemFormErrors = {}
  if (!values.title.trim()) errors.title = 'Title is required'
  if (!values.location.trim()) errors.location = 'Location is required'
  if (!values.occurred_at || !dayjs(values.occurred_at).isValid()) {
    errors.occurred_at = 'Date and time are required'
  } else if (dayjs(values.occurred_at).isAfter(now)) {
    errors.occurred_at = 'Date and time cannot be in the future'
  }
  if (!values.contact_name.trim()) errors.contact_name = 'Contact name is required'
  if (!values.contact_info.trim()) errors.contact_info = 'Contact info is required'
  return errors
}

/**
 * Apply a validation pass limited to `fields`: their errors are replaced (cleared when now valid),
 * errors on other fields are left untouched.
 */
export function mergeFieldErrors(
  previous: ItemFormErrors,
  all: ItemFormErrors,
  fields: (keyof ItemInput)[],
): ItemFormErrors {
  const next = { ...previous }
  for (const field of fields) next[field] = all[field]
  return next
}

/** Only the errors for `fields`. */
export const pickErrors = (all: ItemFormErrors, fields: (keyof ItemInput)[]): ItemFormErrors =>
  Object.fromEntries(fields.filter((f) => all[f]).map((f) => [f, all[f]]))
