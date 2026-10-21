import { useState, type ChangeEvent } from 'react'
import type { ItemInput, UploadedImage } from '../../../types/item'
import {
  createEmptyItemInput,
  mergeFieldErrors,
  pickErrors,
  validateItemInput,
  type ItemFormErrors,
} from './itemFormValidation'

type TextFieldKey = 'title' | 'description' | 'location' | 'contact_name' | 'contact_info'

/** Shared state for the single-page item form and the step-by-step report form. */
export function useItemForm(initialValues?: ItemInput, initialImage: UploadedImage | null = null) {
  const [values, setValues] = useState<ItemInput>(() => initialValues ?? createEmptyItemInput())
  const [image, setImage] = useState<UploadedImage | null>(initialImage)
  const [imageUploading, setImageUploading] = useState(false)
  const [errors, setErrors] = useState<ItemFormErrors>({})

  const setField = <K extends keyof ItemInput>(key: K, value: ItemInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const textFieldProps = (key: TextFieldKey) => ({
    fullWidth: true,
    value: values[key],
    error: Boolean(errors[key]),
    helperText: errors[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setField(key, e.target.value),
  })

  /** Validate the given fields (all when omitted). Returns the errors found. */
  const validate = (fields?: (keyof ItemInput)[]): ItemFormErrors => {
    const all = validateItemInput(values)
    if (!fields) {
      setErrors(all)
      return all
    }
    setErrors((e) => mergeFieldErrors(e, all, fields))
    return pickErrors(all, fields)
  }

  const getSubmitValues = (): ItemInput => ({ ...values, image_key: image?.key ?? null })

  return {
    values,
    errors,
    setField,
    textFieldProps,
    validate,
    image,
    setImage,
    imageUploading,
    setImageUploading,
    getSubmitValues,
  }
}

export type ItemFormApi = ReturnType<typeof useItemForm>
