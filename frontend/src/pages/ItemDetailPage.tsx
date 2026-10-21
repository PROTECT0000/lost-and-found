import { useEffect, useState } from 'react'
import { Skeleton, Stack } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useItemStore } from '../store/useItemStore'
import { useItemActions } from '../hooks/useItemActions'
import { useIsAdmin } from '../hooks/useIsAdmin'
import BackButton from '../components/common/BackButton'
import ConfirmDialog from '../components/common/ConfirmDialog'
import ErrorState from '../components/common/ErrorState'
import ItemActions from '../components/items/ItemActions'
import ItemDetails from '../components/items/ItemDetails'

export default function ItemDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const { current: item, loading, saving, error, fetchItem } = useItemStore()
  const { toggleStatus, remove } = useItemActions()
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    fetchItem(id)
  }, [id, fetchItem])

  const handleDelete = async () => {
    if (!item) return
    const deleted = await remove(item)
    setConfirmOpen(false)
    if (deleted) navigate(-1)
  }

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
      >
        <BackButton />
        {item && isAdmin && (
          <ItemActions
            item={item}
            busy={saving}
            onToggleStatus={() => toggleStatus(item)}
            onDelete={() => setConfirmOpen(true)}
          />
        )}
      </Stack>

      {error && <ErrorState message={error} onRetry={() => fetchItem(id)} />}
      {loading && <Skeleton variant="rounded" height={480} />}
      {item && <ItemDetails item={item} />}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete item?"
        message="This report will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        loading={saving}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  )
}
