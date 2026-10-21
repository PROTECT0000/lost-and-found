import { useState, type FormEvent } from 'react'
import { Button, Paper, Stack } from '@mui/material'
import { MdArrowBack, MdArrowForward, MdSend } from 'react-icons/md'
import type { ItemInput } from '../../../types/item'
import { useItemForm } from './useItemForm'
import { REPORT_STEPS, firstInvalidStep, type ItemFormStep } from './steps'
import StepHeader from './StepHeader'
import FormSection from './FormSection'
import DetailsFields from './DetailsFields'
import WhereWhenFields from './WhereWhenFields'
import PhotoField from './PhotoField'
import ContactFields from './ContactFields'
import ItemReview from './ItemReview'

interface ItemWizardProps {
  submitting?: boolean
  onSubmit: (values: ItemInput) => void
  onCancel: () => void
}

export default function ItemWizard({ submitting = false, onSubmit, onCancel }: ItemWizardProps) {
  const form = useItemForm()
  const [activeStep, setActiveStep] = useState(0)
  const step = REPORT_STEPS[activeStep]
  const isLast = activeStep === REPORT_STEPS.length - 1

  const goToIndex = (index: number) => {
    setActiveStep(index)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goTo = (key: ItemFormStep) => goToIndex(REPORT_STEPS.findIndex((s) => s.key === key))

  const handleNext = () => {
    if (Object.keys(form.validate(step.fields)).length === 0) goToIndex(activeStep + 1)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // Pressing Enter in a field advances instead of submitting early.
    if (!isLast) return handleNext()

    const firstInvalid = firstInvalidStep(REPORT_STEPS, form.validate())
    if (firstInvalid >= 0) return goToIndex(firstInvalid)
    onSubmit(form.getSubmitValues())
  }

  const renderStep = (key: ItemFormStep) => {
    switch (key) {
      case 'details':
        return <DetailsFields form={form} />
      case 'whereWhen':
        return <WhereWhenFields form={form} />
      case 'photo':
        return <PhotoField form={form} />
      case 'contact':
        return <ContactFields form={form} />
      case 'review':
        return <ItemReview form={form} goTo={goTo} />
    }
  }

  return (
    <Paper variant="outlined" component="form" noValidate onSubmit={handleSubmit} sx={{ p: { xs: 2, sm: 4 } }}>
      <StepHeader steps={REPORT_STEPS} activeStep={activeStep} />
      <FormSection title={step.label} description={step.description}>
        {renderStep(step.key)}
      </FormSection>

      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', mt: 4 }}>
        {activeStep === 0 ? (
          <Button onClick={onCancel}>Cancel</Button>
        ) : (
          <Button startIcon={<MdArrowBack />} onClick={() => goToIndex(activeStep - 1)} disabled={submitting}>
            Back
          </Button>
        )}
        {isLast ? (
          <Button type="submit" variant="contained" startIcon={<MdSend />} loading={submitting}>
            Submit report
          </Button>
        ) : (
          <Button
            type="submit"
            variant="contained"
            endIcon={<MdArrowForward />}
            disabled={form.imageUploading}
          >
            {step.key === 'photo' && !form.image ? 'Skip' : 'Next'}
          </Button>
        )}
      </Stack>
    </Paper>
  )
}
