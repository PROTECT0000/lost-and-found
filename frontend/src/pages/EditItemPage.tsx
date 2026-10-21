import { useEffect } from 'react'
import { Skeleton } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useItemStore } from '../store/useItemStore'
import { useSnackbarStore } from '../store/useSnackbarStore'
import { getErrorMessage } from '../api/client'
import type { Item, ItemInput } from '../types/item'
import BackButton from '../components/common/BackButton'
import ErrorState from '../components/common/ErrorState'
import PageHeader from '../components/common/PageHeader'
import ItemForm from '../components/items/form/ItemForm'

const toInput = ({
  id: _id,
  image_url: _i,
  created_at: _c,
  updated_at: _u,
  resolved_by: _rb,
  resolution_note: _rn,
  resolved_at: _ra,
  ...input
}: Item): ItemInput => input

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
          initialValues={toInput(item)}
          initialImage={item.image_key && item.image_url ? { key: item.image_key, url: item.image_url } : null}
          submitLabel="Save changes"
          submitting={saving}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/items/${id}`)}
        />
      )}
    </>
  )
}
