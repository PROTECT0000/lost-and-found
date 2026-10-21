import { useState } from 'react'
import { uploadsApi } from '../api/uploads'
import { getErrorMessage } from '../api/client'
import { compressImage } from '../utils/compressImage'
import type { UploadedImage } from '../types/item'

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File): Promise<UploadedImage | null> => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return null
    }
    setUploading(true)
    setProgress(0)
    setError(null)
    try {
      const compressed = await compressImage(file)
      return await uploadsApi.uploadImage(compressed, setProgress)
    } catch (err) {
      setError(getErrorMessage(err))
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, progress, error, clearError: () => setError(null) }
}
