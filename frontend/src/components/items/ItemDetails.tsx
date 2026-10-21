import { Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material'
import { MdCategory, MdEvent, MdLocationOn, MdPerson, MdPhone, MdUpdate } from 'react-icons/md'
import type { Item } from '../../types/item'
import { categoryLabel } from '../../constants/items'
import { formatDateTime } from '../../utils/format'
import InfoRow from '../common/InfoRow'
import ItemImage from './ItemImage'
import StatusChip from './StatusChip'
import TypeChip from './TypeChip'

export default function ItemDetails({ item }: { item: Item }) {
  return (
    <Card>
      <ItemImage src={item.image_url} alt={item.title} height={280} />
      <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TypeChip type={item.type} />
          <StatusChip status={item.status} />
        </Stack>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }} gutterBottom>
          {item.title}
        </Typography>
        <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
          {item.description || 'No description provided.'}
        </Typography>
        <Divider sx={{ my: 3 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow icon={MdCategory} label="Category" value={categoryLabel(item.category)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow icon={MdLocationOn} label="Location" value={item.location} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow
              icon={MdEvent}
              label={item.type === 'lost' ? 'Lost on' : 'Found on'}
              value={formatDateTime(item.occurred_at)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow icon={MdUpdate} label="Last updated" value={formatDateTime(item.updated_at)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow icon={MdPerson} label="Contact name" value={item.contact_name} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow icon={MdPhone} label="Contact info" value={item.contact_info} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
