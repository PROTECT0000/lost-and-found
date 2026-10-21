import { useEffect } from 'react'
import { Skeleton } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useItemStore } from '../store/useItemStore'
import { useSnackbarStore } from '../store/useSnackbarStore'
import { getErrorMessage } from '../api/client'
import type { ItemInput } from '../types/item'
import BackButton from '../components/common/BackButton'
import ErrorState from '../components/common/ErrorState'
import PageHeader from '../components/common/PageHeader'
import ItemForm from '../components/items/form/ItemForm'
import { itemImage, itemToInput } from '../components/items/form/itemFormValidation'

export default function EditItemPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { current: item, loading, saving, error, fetchItem, updateItem } = useItemStore()
  const showSnackbar = useSnackbarStore((s) => s.show)

  useEffect(() => {
    fetchItem(id)
  }, [id, fetchItem])

  const handleSubmit = async (values: ItemInput) => {
    try {
      await updateItem(id, values)
      showSnackbar('Item updated')
      navigate(`/items/${id}`)
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    }
  }

  return (
    <>
      <BackButton to={`/items/${id}`} label="Back to item" />
      <PageHeader title="Edit item" />
      {error && <ErrorState message={error} onRetry={() => fetchItem(id)} />}
      {loading && <Skeleton variant="rounded" height={520} />}
      {item && item.id === id && (
        <ItemForm
          key={item.id}
          initialValues={itemToInput(item)}
          initialImage={itemImage(item)}
          submitLabel="Save changes"
          submitting={saving}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/items/${id}`)}
        />
      )}
    </>
  )
}
