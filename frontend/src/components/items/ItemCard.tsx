import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MdEvent, MdLocationOn } from 'react-icons/md'
import type { Item } from '../../types/item'
import { categoryLabel } from '../../constants/items'
import { formatDateTime } from '../../utils/format'
import TypeChip from './TypeChip'
import StatusChip from './StatusChip'
import ItemImage from './ItemImage'

export default function ItemCard({ item }: { item: Item }) {
  return (
    <Card sx={{ height: '100%', opacity: item.status === 'resolved' ? 0.75 : 1 }}>
      <CardActionArea component={RouterLink} to={`/items/${item.id}`} sx={{ height: '100%' }}>
        <ItemImage src={item.image_url} alt={item.title} height={160} />
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TypeChip type={item.type} />
            <StatusChip status={item.status} />
          </Stack>
          <Typography variant="h6" noWrap>
            {item.title}
          </Typography>
          <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
            {categoryLabel(item.category)}
          </Typography>
          <Stack spacing={0.5} sx={{ color: 'text.secondary' }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <MdLocationOn />
              <Typography variant="body2" noWrap>
                {item.location}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <MdEvent />
              <Typography variant="body2">{formatDateTime(item.occurred_at)}</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
