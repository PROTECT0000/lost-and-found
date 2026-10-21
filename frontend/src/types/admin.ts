import type { ItemCategory } from './item'

export interface AdminStats {
  total: number
  open: number
  resolved: number
  lost: number
  found: number
  byCategory: { category: ItemCategory; count: number }[]
}

export interface LoginResponse {
  token: string
  /** Expiry as a Unix timestamp in milliseconds. */
  expiresAt: number
}
