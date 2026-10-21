import dayjs from 'dayjs'
import type { ItemInput } from '../../../types/item'

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
