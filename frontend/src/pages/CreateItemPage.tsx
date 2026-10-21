import { useNavigate } from 'react-router-dom'
import { useItemStore } from '../store/useItemStore'
import { useSnackbarStore } from '../store/useSnackbarStore'
import { getErrorMessage } from '../api/client'
import type { ItemInput } from '../types/item'
import BackButton from '../components/common/BackButton'
import PageHeader from '../components/common/PageHeader'
import ItemWizard from '../components/items/form/ItemWizard'

export default function CreateItemPage() {
  const navigate = useNavigate()
  const { createItem, saving } = useItemStore()
  const showSnackbar = useSnackbarStore((s) => s.show)

  const handleSubmit = async (values: ItemInput) => {
    try {
      const item = await createItem(values)
      showSnackbar('Item reported successfully')
      navigate(`/items/${item.id}`)
    } catch (err) {
      showSnackbar(getErrorMessage(err), 'error')
    }
  }

  return (
    <>
      <BackButton />
      <PageHeader title="Report an item" />
      <ItemWizard submitting={saving} onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
    </>
  )
}
