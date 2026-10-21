export type ItemType = 'lost' | 'found'
export type ItemStatus = 'open' | 'resolved'
export type ItemCategory =
  | 'electronics'
  | 'wallet'
  | 'keys'
  | 'bag'
  | 'clothing'
  | 'documents'
  | 'jewelry'
  | 'other'

export interface Item {
  id: string
  type: ItemType
  title: string
  description: string
  category: ItemCategory
  location: string
  /** ISO 8601 UTC datetime. */
  occurred_at: string
  contact_name: string
  contact_info: string
  image_key: string | null
  /** Derived by the API from image_key. */
  image_url: string | null
  status: ItemStatus
  /** Who collected or claimed the item; only set when resolved. */
  resolved_by: string | null
  resolution_note: string | null
  /** ISO 8601 UTC datetime of when the item was resolved; null while open. */
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type ItemInput = Omit<
  Item,
  'id' | 'image_url' | 'created_at' | 'updated_at' | 'resolved_by' | 'resolution_note' | 'resolved_at'
>

/** Details sent with status "resolved"; reopening an item clears them on the server. */
export interface ResolutionInput {
  resolved_by: string
  resolution_note?: string
}

export type ItemUpdate = Partial<ItemInput> & Partial<ResolutionInput>

export interface UploadedImage {
  key: string
  url: string
}

export interface ItemFilters {
  type?: ItemType
  status?: ItemStatus
  category?: ItemCategory
  q?: string
  page: number
  limit: number
}

/** How the home page lists items. */
export type ViewMode = 'card' | 'table'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}
