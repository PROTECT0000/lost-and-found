import { describe, expect, it } from 'vitest'
import { REPORT_STEPS, firstInvalidStep } from './steps'
import type { ItemInput } from '../../../types/item'

describe('REPORT_STEPS', () => {
  it('covers every user-editable field exactly once', () => {
    const fields = REPORT_STEPS.flatMap((s) => s.fields).sort()
    const expected: (keyof ItemInput)[] = [
      'category',
      'contact_info',
      'contact_name',
      'description',
      'location',
      'occurred_at',
      'title',
      'type',
    ]
    expect(fields).toEqual(expected.sort())
  })

  it('ends with the review step', () => {
    expect(REPORT_STEPS.at(-1)?.key).toBe('review')
  })
})

describe('firstInvalidStep', () => {
  const indexOf = (key: string) => REPORT_STEPS.findIndex((s) => s.key === key)

  it('returns -1 when there are no errors', () => {
    expect(firstInvalidStep(REPORT_STEPS, {})).toBe(-1)
    expect(firstInvalidStep(REPORT_STEPS, { title: undefined })).toBe(-1)
  })

  it('returns the earliest step with an error', () => {
    expect(firstInvalidStep(REPORT_STEPS, { contact_info: 'x', location: 'y' })).toBe(indexOf('whereWhen'))
    expect(firstInvalidStep(REPORT_STEPS, { contact_name: 'x' })).toBe(indexOf('contact'))
    expect(firstInvalidStep(REPORT_STEPS, { title: 'x', contact_name: 'y' })).toBe(indexOf('details'))
  })
})
