import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField } from '@mui/material'
import type { Item, ResolutionInput } from '../../types/item'
import { resolvedByLabel } from '../../constants/items'

const MAX_RESOLVED_BY = 100
const MAX_NOTE = 500

interface ResolveItemDialogProps {
  /** The item being resolved; the dialog is open while this is set. */
  item: Item | null
  loading?: boolean
  onConfirm: (details: ResolutionInput) => void
  onClose: () => void
}

/** Asks who took the item (and an optional note) before marking it resolved. */
export default function ResolveItemDialog({ item, loading = false, onConfirm, onClose }: ResolveItemDialogProps) {
  return (
    <Dialog open={Boolean(item)} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      {/* Keyed by item so the fields start empty for each item. */}
      {item && <ResolveForm key={item.id} item={item} loading={loading} onConfirm={onConfirm} onClose={onClose} />}
    </Dialog>
  )
}

function ResolveForm({ item, loading, onConfirm, onClose }: ResolveItemDialogProps & { item: Item }) {
  const [resolvedBy, setResolvedBy] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  const name = resolvedBy.trim()
  const nameError = touched && !name ? 'Required' : undefined

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (name) onConfirm({ resolved_by: name, resolution_note: note.trim() || undefined })
      }}
    >
      <DialogTitle>Mark as resolved</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Record who took &ldquo;{item.title}&rdquo;. Reopening the item clears these details.
        </DialogContentText>
        <Stack spacing={2}>
          <TextField
            autoFocus
            required
            label={resolvedByLabel(item)}
            placeholder="Name of the person"
            value={resolvedBy}
            onChange={(e) => setResolvedBy(e.target.value)}
            onBlur={() => setTouched(true)}
            error={Boolean(nameError)}
            helperText={nameError}
            slotProps={{ htmlInput: { maxLength: MAX_RESOLVED_BY } }}
          />
          <TextField
            label="Notes"
            placeholder="e.g. Picked up at the front desk, ID checked"
            multiline
            minRows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            helperText={`${note.length}/${MAX_NOTE}`}
            slotProps={{ htmlInput: { maxLength: MAX_NOTE } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" color="success" loading={loading}>
          Mark resolved
        </Button>
      </DialogActions>
    </form>
  )
}
