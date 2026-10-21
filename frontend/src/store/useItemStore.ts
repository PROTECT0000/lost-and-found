import { create } from 'zustand'
import { itemsApi } from '../api/items'
import { getErrorMessage } from '../api/client'
import type { Item, ItemFilters, ItemInput, ItemUpdate, PaginationMeta } from '../types/item'
import { DEFAULT_PAGE_SIZE } from '../constants/items'

interface ItemState {
  items: Item[]
  meta: PaginationMeta
  current: Item | null
  loading: boolean
  saving: boolean
  error: string | null
  fetchItems: (filters: ItemFilters) => Promise<void>
  fetchItem: (id: string) => Promise<void>
  createItem: (input: ItemInput) => Promise<Item>
  updateItem: (id: string, input: ItemUpdate) => Promise<Item>
  deleteItem: (id: string) => Promise<void>
}

// Increments per list request so a slow, outdated response never overwrites a newer one.
let listRequest = 0

export const useItemStore = create<ItemState>((set) => ({
  items: [],
  meta: { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0 },
  current: null,
  loading: false,
  saving: false,
  error: null,

  fetchItems: async (filters) => {
    const request = ++listRequest
    set({ loading: true, error: null })
    try {
      const { data, meta } = await itemsApi.list(filters)
      if (request === listRequest) set({ items: data, meta, loading: false })
    } catch (error) {
      if (request === listRequest) set({ error: getErrorMessage(error), loading: false })
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
