import { apiClient } from './client'
import type { Item, ItemFilters, ItemInput, Paginated } from '../types/item'

/** Largest page the API serves (maxLimit in the backend). */
const MAX_PAGE_SIZE = 100

export const itemsApi = {
  list: (filters: ItemFilters) =>
    apiClient.get<Paginated<Item>>('/items', { params: filters }).then((r) => r.data),
  /** Every item matching the filters, fetched page by page. */
  listAll: async (filters: Omit<ItemFilters, 'page' | 'limit'>) => {
    // Keyed by id: an item created mid-export shifts later pages, which would otherwise repeat a row.
    const items = new Map<string, Item>()
    for (let page = 1; ; page++) {
      const { data, meta } = await itemsApi.list({ ...filters, page, limit: MAX_PAGE_SIZE })
      data.forEach((item) => items.set(item.id, item))
      if (data.length < MAX_PAGE_SIZE || page * MAX_PAGE_SIZE >= meta.total) return [...items.values()]
    }
  },
  get: (id: string) => apiClient.get<Item>(`/items/${id}`).then((r) => r.data),
  create: (input: ItemInput) => apiClient.post<Item>('/items', input).then((r) => r.data),
  update: (id: string, input: Partial<ItemInput>) =>
    apiClient.patch<Item>(`/items/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/items/${id}`),
}
