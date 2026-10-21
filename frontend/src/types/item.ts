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
  created_at: string
  updated_at: string
}

export type ItemInput = Omit<Item, 'id' | 'image_url' | 'created_at' | 'updated_at'>

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

export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}
