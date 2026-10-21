import { Grid } from '@mui/material'
import type { Item } from '../../types/item'
import ItemCard from './ItemCard'

export default function ItemGrid({ items }: { items: Item[] }) {
  return (
    <Grid container spacing={3}>
      {items.map((item) => (
        <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
          <ItemCard item={item} />
        </Grid>
      ))}
    </Grid>
  )
}
