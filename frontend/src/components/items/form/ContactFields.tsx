import { Grid, TextField } from '@mui/material'
import type { ItemFormApi } from './useItemForm'

export default function ContactFields({ form }: { form: ItemFormApi }) {
  const { textFieldProps } = form
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField label="Contact name" required {...textFieldProps('contact_name')} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField label="Contact info (email / phone)" required {...textFieldProps('contact_info')} />
      </Grid>
    </Grid>
  )
}
