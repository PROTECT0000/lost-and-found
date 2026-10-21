import { Grid, TextField } from '@mui/material'
import OccurredAtPicker from '../OccurredAtPicker'
import type { ItemFormApi } from './useItemForm'

export default function WhereWhenFields({ form }: { form: ItemFormApi }) {
  const { values, errors, setField, textFieldProps } = form
  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <TextField label="Location" required placeholder="e.g. Central Library, 2nd floor" {...textFieldProps('location')} />
      </Grid>
      <Grid size={12}>
        <OccurredAtPicker
          verb={values.type}
          value={values.occurred_at}
          error={errors.occurred_at}
          onChange={(occurredAt) => setField('occurred_at', occurredAt)}
        />
      </Grid>
    </Grid>
  )
}
