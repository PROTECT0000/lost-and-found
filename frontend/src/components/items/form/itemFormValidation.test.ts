import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import type { ItemInput } from '../../../types/item'
import { mergeFieldErrors, pickErrors, validateItemInput } from './itemFormValidation'

const now = dayjs('2026-10-21T12:00:00Z')

const valid: ItemInput = {
  type: 'lost',
  title: 'Wallet',
  description: '',
  category: 'wallet',
  location: 'Library',
  occurred_at: '2026-10-20T08:00:00.000Z',
  contact_name: 'Rina',
  contact_info: 'rina@example.com',
  image_key: null,
  status: 'open',
}

describe('validateItemInput', () => {
  it('accepts a complete item', () => {
    expect(validateItemInput(valid, now)).toEqual({})
  })

  it('treats whitespace-only text as missing', () => {
    const errors = validateItemInput({ ...valid, title: '   ', location: '\n', contact_name: ' ', contact_info: '' }, now)
    expect(Object.keys(errors).sort()).toEqual(['contact_info', 'contact_name', 'location', 'title'])
  })

  it('requires a valid date and time', () => {
    expect(validateItemInput({ ...valid, occurred_at: '' }, now).occurred_at).toBeDefined()
    expect(validateItemInput({ ...valid, occurred_at: 'not a date' }, now).occurred_at).toBeDefined()
  })

  it('rejects a date and time in the future, but not the present moment', () => {
    expect(validateItemInput({ ...valid, occurred_at: '2026-10-21T12:01:00.000Z' }, now).occurred_at).toMatch(/future/)
    expect(validateItemInput({ ...valid, occurred_at: '2026-10-21T12:00:00.000Z' }, now).occurred_at).toBeUndefined()
  })
})

describe('mergeFieldErrors', () => {
  it('replaces errors for the validated fields only', () => {
    const previous = { title: 'Title is required', contact_name: 'Contact name is required' }
    const all = { location: 'Location is required', contact_name: 'Contact name is required' }

    expect(mergeFieldErrors(previous, all, ['title', 'location'])).toEqual({
      title: undefined, // fixed since the last check
      location: 'Location is required',
      contact_name: 'Contact name is required', // other step, untouched
    })
  })
})

describe('pickErrors', () => {
  it('returns only errors for the given fields', () => {
    const all = { title: 'x', location: 'y' }
    expect(pickErrors(all, ['title', 'contact_name'])).toEqual({ title: 'x' })
  })
})
