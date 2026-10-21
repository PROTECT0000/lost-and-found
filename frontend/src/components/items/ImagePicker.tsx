import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material'
import { MdAddPhotoAlternate, MdDelete, MdPhotoCamera, MdPhotoLibrary } from 'react-icons/md'
import type { UploadedImage } from '../../types/item'
import { resolveAssetUrl } from '../../api/client'
import { useImageUpload } from '../../hooks/useImageUpload'
import { isMobileDevice } from '../../utils/device'

interface ImagePickerProps {
  value: UploadedImage | null
  onChange: (image: UploadedImage | null) => void
  onUploadingChange?: (uploading: boolean) => void
}

export default function ImagePicker({ value, onChange, onUploadingChange }: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const captureInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { upload, uploading, progress, error, clearError } = useImageUpload()

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    onUploadingChange?.(true)
    const image = await upload(file)
    onUploadingChange?.(false)
    if (image) onChange(image)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0])
    e.target.value = '' // allow re-selecting the same file
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const canTakePhoto = isMobileDevice()

  return (
    <Stack spacing={1.5}>
      <Box
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        sx={{
          height: 220,
          borderRadius: 1,
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: 'grey.100',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
        }}
      >
        {value ? (
          <Box
            component="img"
            src={resolveAssetUrl(value.url)}
            alt="Item preview"
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            <MdAddPhotoAlternate size={44} />
            <Typography variant="body2">
              {canTakePhoto ? 'Upload an image or take a photo' : 'Drop an image here or upload one'}
            </Typography>
          </Stack>
        )}
      </Box>

      {uploading && <LinearProgress variant={progress ? 'determinate' : 'indeterminate'} value={progress} />}
      {error && (
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="outlined"
          startIcon={<MdPhotoLibrary />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {value ? 'Replace photo' : 'Upload photo'}
        </Button>
        {canTakePhoto && (
          <Button
            variant="outlined"
            startIcon={<MdPhotoCamera />}
            onClick={() => captureInputRef.current?.click()}
            disabled={uploading}
          >
            Take photo
          </Button>
        )}
        {value && (
          <Button color="error" startIcon={<MdDelete />} onClick={() => onChange(null)} disabled={uploading}>
            Remove
          </Button>
        )}
      </Stack>

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleInputChange} />
      <input ref={captureInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleInputChange} />
    </Stack>
  )
}
