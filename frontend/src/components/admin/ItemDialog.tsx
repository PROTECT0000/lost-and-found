import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { MdClose } from 'react-icons/md'
import type { Item, ItemInput } from '../../types/item'
import ItemActions from '../items/ItemActions'
import ItemDetails from '../items/ItemDetails'
import ItemForm from '../items/form/ItemForm'
import { itemImage, itemToInput } from '../items/form/itemFormValidation'

export type ItemDialogMode = 'view' | 'edit'

interface ItemDialogProps {
  /** The item shown; the dialog is open while this is set. */
  item: Item | null
  mode: ItemDialogMode
  saving?: boolean
  onModeChange: (mode: ItemDialogMode) => void
  onSave: (values: ItemInput) => void
  onToggleStatus: (item: Item) => void
  onDelete: (item: Item) => void
  onClose: () => void
}

/** Admin view of an item, with editing in place instead of on a separate page. */
export default function ItemDialog({
  item,
  mode,
  saving = false,
  onModeChange,
  onSave,
  onToggleStatus,
  onDelete,
  onClose,
}: ItemDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const editing = mode === 'edit'

  return (
    <Dialog open={Boolean(item)} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      {item && (
        <>
          <DialogTitle component="div" sx={{ pr: 7 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
            >
              <Box component="h2" sx={{ m: 0, typography: 'h6' }}>
                {editing ? 'Edit item' : 'Item details'}
              </Box>
              {!editing && (
                <ItemActions
                  item={item}
                  busy={saving}
                  onEdit={() => onModeChange('edit')}
                  onToggleStatus={() => onToggleStatus(item)}
                  onDelete={() => onDelete(item)}
                />
              )}
            </Stack>
            <IconButton
              aria-label="Close"
              onClick={onClose}
              disabled={saving}
              sx={{ position: 'absolute', right: 12, top: 12 }}
            >
              <MdClose />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {editing ? (
              <ItemForm
                // A fresh form whenever the dialog switches to another item or back into editing.
                key={item.id}
                embedded
                initialValues={itemToInput(item)}
                initialImage={itemImage(item)}
                submitLabel="Save changes"
                submitting={saving}
                onSubmit={onSave}
                onCancel={() => onModeChange('view')}
              />
            ) : (
              <ItemDetails item={item} />
            )}
          </DialogContent>
        </>
      )}
    </Dialog>
  )
}
