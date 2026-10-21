import { Box, CardMedia } from '@mui/material'
import { MdImage } from 'react-icons/md'
import { resolveAssetUrl } from '../../api/client'

interface ItemImageProps {
  src: string | null
  alt: string
  height: number
}

export default function ItemImage({ src, alt, height }: ItemImageProps) {
  if (src) {
    return <CardMedia component="img" src={resolveAssetUrl(src)} alt={alt} sx={{ height, objectFit: 'cover' }} />
  }
  return (
    <Box
      sx={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        color: 'grey.400',
      }}
    >
      <MdImage size={56} />
    </Box>
  )
}
