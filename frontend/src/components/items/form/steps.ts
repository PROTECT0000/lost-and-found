import type { ItemInput } from '../../../types/item'
import type { ItemFormErrors } from './itemFormValidation'

export type ItemFormStep = 'details' | 'whereWhen' | 'photo' | 'contact' | 'review'

export interface StepConfig {
  key: ItemFormStep
  label: string
  description: string
  /** Fields validated before leaving this step. */
  fields: (keyof ItemInput)[]
}

export const REPORT_STEPS: StepConfig[] = [
  {
    key: 'details',
    label: 'Details',
    description: 'What did you lose or find?',
    fields: ['type', 'title', 'category', 'description'],
  },
  {
    key: 'whereWhen',
    label: 'Where & when',
    description: 'Where and when did it happen?',
    fields: ['location', 'occurred_at'],
  },
  {
    key: 'photo',
    label: 'Photo',
    description: 'A photo helps people recognize the item. This step is optional.',
    fields: [],
  },
  {
    key: 'contact',
    label: 'Contact',
    description: 'How can people reach you?',
    fields: ['contact_name', 'contact_info'],
  },
  {
    key: 'review',
    label: 'Review',
    description: 'Check everything before submitting.',
    fields: [],
  },
]

/** Index of the first step containing a field with an error, or -1 when everything is valid. */
export const firstInvalidStep = (steps: StepConfig[], errors: ItemFormErrors) =>
  steps.findIndex((step) => step.fields.some((field) => errors[field]))
