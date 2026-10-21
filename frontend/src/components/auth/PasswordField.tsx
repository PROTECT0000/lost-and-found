import { useState } from 'react'
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function PasswordField(props: TextFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <MdVisibilityOff /> : <MdVisibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
