import { Box, Divider, Grid, Stack, Typography } from '@mui/material'
import { MdCategory, MdEvent, MdImage, MdLocationOn, MdPerson, MdPhone } from 'react-icons/md'
import { categoryLabel } from '../../../constants/items'
import { resolveAssetUrl } from '../../../api/client'
import { formatDateTime } from '../../../utils/format'
import InfoRow from '../../common/InfoRow'
import TypeChip from '../TypeChip'
import ReviewSection from './ReviewSection'
import type { ItemFormApi } from './useItemForm'
import type { ItemFormStep } from './steps'

interface ItemReviewProps {
  form: ItemFormApi
  goTo: (step: ItemFormStep) => void
}

export default function ItemReview({ form, goTo }: ItemReviewProps) {
  const { values, image } = form
  return (
    <Stack spacing={3} divider={<Divider />}>
      <ReviewSection title="Details" onEdit={() => goTo('details')}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TypeChip type={values.type} />
          <Typography variant="h6">{values.title}</Typography>
        </Stack>
        <InfoRow icon={MdCategory} label="Category" value={categoryLabel(values.category)} />
        <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
          {values.description || 'No description provided.'}
        </Typography>
      </ReviewSection>

      <ReviewSection title="Where & when" onEdit={() => goTo('whereWhen')}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow icon={MdLocationOn} label="Location" value={values.location} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow
              icon={MdEvent}
              label={values.type === 'lost' ? 'Lost on' : 'Found on'}
              value={formatDateTime(values.occurred_at)}
            />
          </Grid>
        </Grid>
      </ReviewSection>

      <ReviewSection title="Photo" onEdit={() => goTo('photo')}>
        {image ? (
          <Box
            component="img"
            src={resolveAssetUrl(image.url)}
            alt="Item photo"
            sx={{ width: '100%', maxHeight: 280, objectFit: 'contain', bgcolor: 'grey.100', borderRadius: 1 }}
          />
        ) : (
          <InfoRow icon={MdImage} label="Photo" value="No photo added" />
        )}
      </ReviewSection>

      <ReviewSection title="Contact" onEdit={() => goTo('contact')}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow icon={MdPerson} label="Contact name" value={values.contact_name} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow icon={MdPhone} label="Contact info" value={values.contact_info} />
          </Grid>
        </Grid>
      </ReviewSection>
    </Stack>
  )
}
