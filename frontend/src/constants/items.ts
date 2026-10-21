import type { ItemCategory, ItemStatus, ItemType } from '../types/item'

export const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'lost', label: 'Lost' },
  { value: 'found', label: 'Found' },
]

export const ITEM_STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
]

export const ITEM_CATEGORY_OPTIONS: { value: ItemCategory; label: string }[] = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'keys', label: 'Keys' },
  { value: 'bag', label: 'Bag' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'documents', label: 'Documents' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'other', label: 'Other' },
]

export const categoryLabel = (value: ItemCategory) =>
  ITEM_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value
