import { LinearProgress, Stack, Step, StepLabel, Stepper, Typography, useMediaQuery, useTheme } from '@mui/material'
import type { StepConfig } from './steps'

interface StepHeaderProps {
  steps: StepConfig[]
  activeStep: number
}

/** Full stepper on larger screens, compact progress bar on phones. */
export default function StepHeader({ steps, activeStep }: StepHeaderProps) {
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('sm'))

  if (compact) {
    return (
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Step {activeStep + 1} of {steps.length}
        </Typography>
        <LinearProgress variant="determinate" value={((activeStep + 1) / steps.length) * 100} />
      </Stack>
    )
  }

  return (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
      {steps.map((step) => (
        <Step key={step.key}>
          <StepLabel>{step.label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  )
}
