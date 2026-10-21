import { FormLabel, Grid, Stack, TextField } from '@mui/material'
import { ITEM_CATEGORY_OPTIONS } from '../../../constants/items'
import SelectField from '../../common/SelectField'
import ItemTypeToggle from '../ItemTypeToggle'
import type { ItemFormApi } from './useItemForm'

export default function DetailsFields({ form }: { form: ItemFormApi }) {
  const { values, setField, textFieldProps } = form
  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Stack spacing={1}>
          <FormLabel>I have...</FormLabel>
          <ItemTypeToggle fullWidth value={values.type} onChange={(type) => type && setField('type', type)} />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <TextField label="Title" required placeholder="e.g. Black leather wallet" {...textFieldProps('title')} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <SelectField
          fullWidth
          label="Category"
          options={ITEM_CATEGORY_OPTIONS}
          value={values.category}
          onChange={(category) => category && setField('category', category)}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="Description"
          multiline
          minRows={3}
          placeholder="Color, brand, distinguishing marks..."
          {...textFieldProps('description')}
        />
      </Grid>
    </Grid>
  )
}
