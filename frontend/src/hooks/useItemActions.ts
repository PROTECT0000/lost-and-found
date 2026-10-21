import { useState } from 'react'
import { useItemStore } from '../store/useItemStore'
import { useSnackbarStore } from '../store/useSnackbarStore'
import { getErrorMessage } from '../api/client'
import type { Item, ItemUpdate, ResolutionInput } from '../types/item'

interface ItemActionsOptions {
  /** Called after an item was resolved or reopened. */
  onStatusChange?: (item: Item) => void
}

/**
 * Status changes and delete with user feedback. Marking an item resolved first asks who took it:
 * render ResolveItemDialog with `resolveDialog`. Reopen and delete resolve to true on success.
 */
export function useItemActions({ onStatusChange }: ItemActionsOptions = {}) {
  const updateItem = useItemStore((s) => s.updateItem)
  const deleteItem = useItemStore((s) => s.deleteItem)
  const saving = useItemStore((s) => s.saving)
  const showSnackbar = useSnackbarStore((s) => s.show)
  const [resolving, setResolving] = useState<Item | null>(null)

  const setStatus = async (item: Item, input: ItemUpdate, message: string) => {
    try {
      const updated = await updateItem(item.id, input)
      showSnackbar(message)
      onStatusChange?.(updated)
      return true
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
      return false
    }
  }

  /** Reopens a resolved item, or opens the resolve dialog for an open one. */
  const toggleStatus = (item: Item) => {
    if (item.status === 'resolved') return setStatus(item, { status: 'open' }, 'Item reopened')
    setResolving(item)
    return Promise.resolve(false)
  }

  const resolve = async (details: ResolutionInput) => {
    if (!resolving) return
    if (await setStatus(resolving, { status: 'resolved', ...details }, 'Marked as resolved')) setResolving(null)
  }

  const remove = async (item: Item) => {
    try {
      await deleteItem(item.id)
      showSnackbar('Item deleted')
      return true
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
      return false
    }
  }

  const resolveDialog = { item: resolving, loading: saving, onConfirm: resolve, onClose: () => setResolving(null) }

  return { toggleStatus, remove, resolveDialog }
}
