import { MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material'
import type { PaginationMeta } from '../../types/item'
import { PAGE_SIZE_OPTIONS } from '../../constants/items'

interface ItemsPaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  onPageSizeChange: (limit: number) => void
}

/** Range summary, page links and a page-size picker for the card grid. */
export default function ItemsPagination({ meta, onPageChange, onPageSizeChange }: ItemsPaginationProps) {
  if (meta.total === 0) return null
  const pageCount = Math.ceil(meta.total / meta.limit)
  const from = (meta.page - 1) * meta.limit + 1
  const to = Math.min(meta.page * meta.limit, meta.total)

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ mt: 4, alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Typography variant="body2" color="text.secondary">
        Showing {from}–{to} of {meta.total}
      </Typography>
      {pageCount > 1 && (
        <Pagination
          color="primary"
          count={pageCount}
          page={meta.page}
          siblingCount={1}
          onChange={(_, page) => {
            onPageChange(page)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}
      <TextField
        select
        size="small"
        label="Per page"
        value={meta.limit}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        sx={{ minWidth: 110 }}
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <MenuItem key={n} value={n}>
            {n}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  )
}
