import ImagePicker from '../ImagePicker'
import type { ItemFormApi } from './useItemForm'

export default function PhotoField({ form }: { form: ItemFormApi }) {
  return <ImagePicker value={form.image} onChange={form.setImage} onUploadingChange={form.setImageUploading} />
}
