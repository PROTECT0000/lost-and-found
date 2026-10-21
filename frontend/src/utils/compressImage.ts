const MAX_DIMENSION = 1600
const QUALITY = 0.85

const canvasToBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))

/**
 * Downscale and re-encode a photo in the browser so phone pictures (often 5–12 MB)
 * upload quickly. GIFs are passed through to keep animation.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('This image format is not supported. Please use JPEG, PNG or WebP.')
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  // Browsers without WebP encoding fall back to PNG; use JPEG in that case.
  let blob = await canvasToBlob(canvas, 'image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg')
  if (!blob) throw new Error('Could not process the image')

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.${ext}`, { type: blob.type })
}
