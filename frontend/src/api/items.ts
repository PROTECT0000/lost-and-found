import { apiClient } from './client'
import type { Item, ItemFilters, ItemInput, Paginated } from '../types/item'

export const itemsApi = {
  list: (filters: ItemFilters) =>
    apiClient.get<Paginated<Item>>('/items', { params: filters }).then((r) => r.data),
  get: (id: string) => apiClient.get<Item>(`/items/${id}`).then((r) => r.data),
  create: (input: ItemInput) => apiClient.post<Item>('/items', input).then((r) => r.data),
  update: (id: string, input: Partial<ItemInput>) =>
    apiClient.patch<Item>(`/items/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/items/${id}`),
}
