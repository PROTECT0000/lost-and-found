import type { Item, ItemCategory, ItemStatus, ItemType, SortField } from '../types/item'

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

/**
 * One fixed chart color per category, in category order, so a category keeps its color in the
 * dashboard and in exports whatever the counts are. Checked for color-blind separation; the lighter
 * hues sit below 3:1 against white, so charts always name each slice next to its color.
 */
export const CATEGORY_COLORS: Record<ItemCategory, string> = {
  electronics: '#2a78d6',
  wallet: '#eb6834',
  keys: '#1baf7a',
  bag: '#eda100',
  clothing: '#e87ba4',
  documents: '#008300',
  jewelry: '#6250d6',
  other: '#e34948',
}

/** Chart colors for open vs resolved (always shown with their labels). */
export const STATUS_CHART_COLORS: Record<ItemStatus, string> = { open: '#2a78d6', resolved: '#1baf7a' }

/** Columns the item lists can be sorted by (the API's `sort` values). */
export const SORT_FIELDS: SortField[] = ['created_at', 'occurred_at', 'title', 'type', 'category', 'location', 'status']

/** A found item is collected by its owner; a lost item is brought back by whoever found it. */
export const resolvedByLabel = (item: Pick<Item, 'type'>) => (item.type === 'found' ? 'Collected by' : 'Returned by')

/** Page sizes offered in lists; multiples of 3 and 4 so grid rows stay full. */
export const PAGE_SIZE_OPTIONS = [12, 24, 48]
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]
