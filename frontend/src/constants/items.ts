import type { Item, ItemCategory, ItemStatus, ItemType } from '../types/item'

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

/** A found item is collected by its owner; a lost item is brought back by whoever found it. */
export const resolvedByLabel = (item: Pick<Item, 'type'>) => (item.type === 'found' ? 'Collected by' : 'Returned by')

/** Page sizes offered in lists; multiples of 3 and 4 so grid rows stay full. */
export const PAGE_SIZE_OPTIONS = [12, 24, 48]
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]
