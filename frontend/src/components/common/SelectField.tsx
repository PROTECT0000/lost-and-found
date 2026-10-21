import { MenuItem, TextField, type TextFieldProps } from '@mui/material'

interface Option<T extends string> {
  value: T
  label: string
}

type SelectFieldProps<T extends string> = Omit<TextFieldProps, 'select' | 'onChange' | 'value'> & {
  value: T | ''
  options: Option<T>[]
  onChange: (value: T | '') => void
  allLabel?: string
}

/** TextField-based select; pass `allLabel` to include an empty "all" option. */
export default function SelectField<T extends string>({
  value,
  options,
  onChange,
  allLabel,
  ...props
}: SelectFieldProps<T>) {
  return (
    <TextField select value={value} onChange={(e) => onChange(e.target.value as T | '')} {...props}>
      {allLabel && <MenuItem value="">{allLabel}</MenuItem>}
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  )
}
