import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { SecretReveal } from '@/components/secret-reveal'
import { ActionError } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useFieldError, vmsg } from '@/i18n'
import { applyServerErrors } from '@/lib/form'
import type { CreatedApiKey } from '../api'
import { useCreateApiKey } from '../queries'

/** CreateApiKeyRequest: name not blank, at most 100 characters. */
const NAME_MAX = 100
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, vmsg('required'))
    .max(NAME_MAX, vmsg('tooLong', { max: NAME_MAX })),
})
type Values = z.infer<typeof schema>

/**
 * Two steps in one dialog: name the key, then reveal it exactly once. The reveal
 * step ignores outside clicks and Escape, so the secret is not lost by accident;
 * only "I've stored it" closes it.
 */
export function CreateKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('apiKeys')
  const fieldError = useFieldError()
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const create = useCreateApiKey()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '' } })
  const { errors } = form.formState

  function close() {
    onOpenChange(false)
    form.reset()
    setCreated(null)
    create.reset()
  }

  function submit({ name }: Values) {
    create.mutate(name, {
      onSuccess: setCreated,
      onError: (error) => applyServerErrors(error, form.setError),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !create.isPending && close()}>
      {created ? (
        <DialogContent
          title={t('form.createdTitle')}
          description={t('form.createdDescription', { name: created.name })}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          footer={
            <Button variant="primary" onClick={close}>
              {t('form.stored')}
            </Button>
          }
        >
          <SecretReveal label={t('form.secretLabel')} secret={created.key} />
        </DialogContent>
      ) : (
        <DialogContent
          title={t('form.title')}
          description={t('form.description')}
          footer={
            <>
              <Button variant="ghost" onClick={close} disabled={create.isPending}>
                {t('form.cancel')}
              </Button>
              <Button variant="primary" type="submit" form="create-key" loading={create.isPending}>
                {t('form.submit')}
              </Button>
            </>
          }
        >
          <form id="create-key" onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4">
            {/* Anything not about the name (network, rate limit) stays here with its requestId. */}
            {create.isError && !errors.name && <ActionError error={create.error} />}
            <Field label={t('form.name')} hint={t('form.nameHint')} error={fieldError(errors.name?.message)}>
              <Input {...form.register('name')} maxLength={NAME_MAX} autoFocus />
            </Field>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
