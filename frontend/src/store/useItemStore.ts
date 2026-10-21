import { create } from 'zustand'
import { itemsApi } from '../api/items'
import { getErrorMessage } from '../api/client'
import type { Item, ItemFilters, ItemInput, PaginationMeta } from '../types/item'

const DEFAULT_FILTERS: ItemFilters = { page: 1, limit: 12 }

interface ItemState {
  items: Item[]
  meta: PaginationMeta
  filters: ItemFilters
  current: Item | null
  loading: boolean
  saving: boolean
  error: string | null
  setFilters: (filters: Partial<ItemFilters>) => void
  resetFilters: () => void
  fetchItems: () => Promise<void>
  fetchItem: (id: string) => Promise<void>
  createItem: (input: ItemInput) => Promise<Item>
  updateItem: (id: string, input: Partial<ItemInput>) => Promise<Item>
  deleteItem: (id: string) => Promise<void>
}

export const useItemStore = create<ItemState>((set, get) => ({
  items: [],
  meta: { page: 1, limit: DEFAULT_FILTERS.limit, total: 0 },
  filters: DEFAULT_FILTERS,
  current: null,
  loading: false,
  saving: false,
  error: null,

  // Any filter change other than page resets pagination to the first page.
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, page: 1, ...filters },
    })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  fetchItems: async () => {
    set({ loading: true, error: null })
    try {
      const { data, meta } = await itemsApi.list(get().filters)
      set({ items: data, meta, loading: false })
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
    }
  },

  fetchItem: async (id) => {
    set({ loading: true, error: null, current: null })
    try {
      const item = await itemsApi.get(id)
      set({ current: item, loading: false })
    } catch (error) {
      set({ error: getErrorMessage(error), loading: false })
    }
  },

  createItem: async (input) => {
    set({ saving: true })
    try {
      return await itemsApi.create(input)
    } finally {
      set({ saving: false })
    }
  },

  updateItem: async (id, input) => {
    set({ saving: true })
    try {
      const item = await itemsApi.update(id, input)
      set((state) => ({
        current: state.current?.id === id ? item : state.current,
        items: state.items.map((i) => (i.id === id ? item : i)),
      }))
      return item
    } finally {
      set({ saving: false })
    }
  },

  deleteItem: async (id) => {
    set({ saving: true })
    try {
      await itemsApi.remove(id)
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        current: state.current?.id === id ? null : state.current,
      }))
    } finally {
      set({ saving: false })
    }
  },
}))
