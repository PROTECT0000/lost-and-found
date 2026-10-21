import { apiClient } from './client'
import type { UploadedImage } from '../types/item'

export const uploadsApi = {
  uploadImage: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .post<UploadedImage>('/uploads', form, {
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data)
  },
}
