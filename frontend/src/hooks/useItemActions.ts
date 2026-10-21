import { useItemStore } from '../store/useItemStore'
import { useSnackbarStore } from '../store/useSnackbarStore'
import { getErrorMessage } from '../api/client'
import type { Item } from '../types/item'

/** Status toggle and delete with user feedback. Each action resolves to true on success. */
export function useItemActions() {
  const updateItem = useItemStore((s) => s.updateItem)
  const deleteItem = useItemStore((s) => s.deleteItem)
  const showSnackbar = useSnackbarStore((s) => s.show)

  const toggleStatus = async (item: Item) => {
    const next = item.status === 'resolved' ? 'open' : 'resolved'
    try {
      await updateItem(item.id, { status: next })
      showSnackbar(next === 'resolved' ? 'Marked as resolved' : 'Item reopened')
      return true
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
      return false
    }
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

  return { toggleStatus, remove }
}
