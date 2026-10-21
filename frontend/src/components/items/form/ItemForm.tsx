import type { FormEvent } from 'react'
import { Button, Divider, Paper, Stack } from '@mui/material'
import { MdSave } from 'react-icons/md'
import type { ItemInput, UploadedImage } from '../../../types/item'
import { ITEM_STATUS_OPTIONS } from '../../../constants/items'
import SelectField from '../../common/SelectField'
import { useItemForm } from './useItemForm'
import FormSection from './FormSection'
import DetailsFields from './DetailsFields'
import WhereWhenFields from './WhereWhenFields'
import PhotoField from './PhotoField'
import ContactFields from './ContactFields'

interface ItemFormProps {
  initialValues: ItemInput
  initialImage?: UploadedImage | null
  submitLabel: string
  submitting?: boolean
  onSubmit: (values: ItemInput) => void
  onCancel: () => void
}

/** Single-page form with every field, used for editing. */
export default function ItemForm({
  initialValues,
  initialImage = null,
  submitLabel,
  submitting = false,
  onSubmit,
  onCancel,
}: ItemFormProps) {
  const form = useItemForm(initialValues, initialImage)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (Object.keys(form.validate()).length === 0) onSubmit(form.getSubmitValues())
  }

  return (
    <Paper variant="outlined" component="form" noValidate onSubmit={handleSubmit} sx={{ p: { xs: 2, sm: 4 } }}>
      <Stack spacing={4} divider={<Divider />}>
        <FormSection title="Details">
          <DetailsFields form={form} />
        </FormSection>
        <FormSection title="Where & when">
          <WhereWhenFields form={form} />
        </FormSection>
        <FormSection title="Photo">
          <PhotoField form={form} />
        </FormSection>
        <FormSection title="Contact">
          <ContactFields form={form} />
        </FormSection>
        <FormSection title="Status">
          <SelectField
            label="Status"
            options={ITEM_STATUS_OPTIONS}
            value={form.values.status}
            onChange={(status) => status && form.setField('status', status)}
            sx={{ maxWidth: { sm: 240 } }}
          />
        </FormSection>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', mt: 4 }}>
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={<MdSave />}
          loading={submitting}
          disabled={form.imageUploading}
        >
          {submitLabel}
        </Button>
      </Stack>
    </Paper>
  )
}
