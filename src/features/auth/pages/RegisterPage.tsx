import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Callout } from '@/components/callout'
import { useDocumentTitle } from '@/components/document-title'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useErrorMessage, useFieldError, useLanguage, vmsg } from '@/i18n'
import { isApiError } from '@/lib/api/errors'
import { applyServerErrors } from '@/lib/form'
import { authApi } from '../api'
import { PASSWORD_MIN_LENGTH, registerSchema, type RegisterValues } from '../schemas'

const EMAIL_TAKEN = vmsg('emailTaken')

export function RegisterPage() {
  const { t } = useTranslation('auth')
  useDocumentTitle(t('register.title'))
  const familyNameFirst = useLanguage() === 'vi'
  const errorMessage = useErrorMessage()
  const fieldError = useFieldError()
  const navigate = useNavigate()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', merchantName: '', email: '', password: '' },
  })
  const email = useWatch({ control: form.control, name: 'email' })

  const register = useMutation({
    mutationFn: authApi.register,
    // Registration does not sign in (no token in the response), so hand off to login.
    onSuccess: (result) =>
      navigate('/login', { replace: true, state: { registeredEmail: result.user.email } }),
    onError: (error) => {
      if (isApiError(error, 'USER_EMAIL_ALREADY_EXISTS')) {
        form.setError('email', { message: EMAIL_TAKEN }, { shouldFocus: true })
      } else {
        applyServerErrors(error, form.setError)
      }
    },
  })

  const { errors } = form.formState
  const emailTaken = errors.email?.message === EMAIL_TAKEN
  // Errors that belong to a field are shown there; the rest go in the callout.
  const showCallout =
    register.isError &&
    !isApiError(register.error, 'USER_EMAIL_ALREADY_EXISTS') &&
    !(isApiError(register.error, 'VALIDATION_ERROR') && register.error.fieldErrors.length > 0)

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight">{t('register.title')}</h1>
      <p className="mt-1 text-sm text-ink-2">{t('register.subtitle')}</p>

      {showCallout && (
        <Callout tone="danger" className="mt-6">
          {errorMessage(register.error)}
        </Callout>
      )}

      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit((v) => register.mutate(v))} noValidate>
        {/* Vietnamese names put the family name first. The DOM order changes too, so
            the tab order matches what is on screen. */}
        <div className="grid grid-cols-2 gap-3">
          {(familyNameFirst
            ? (['lastName', 'firstName'] as const)
            : (['firstName', 'lastName'] as const)
          ).map((name, index) => (
            <Field key={name} label={t(`register.${name}`)} error={fieldError(errors[name]?.message)}>
              <Input
                autoComplete={name === 'firstName' ? 'given-name' : 'family-name'}
                autoFocus={index === 0}
                {...form.register(name)}
              />
            </Field>
          ))}
        </div>
        <Field
          label={t('register.businessName')}
          hint={t('register.businessNameHint')}
          error={fieldError(errors.merchantName?.message)}
        >
          <Input autoComplete="organization" {...form.register('merchantName')} />
        </Field>
        <div className="space-y-1.5">
          <Field label={t('register.email')} error={fieldError(errors.email?.message)}>
            <Input type="email" autoComplete="email" {...form.register('email')} />
          </Field>
          {emailTaken && (
            <Link
              to="/login"
              state={{ email: email.trim() }}
              className="inline-block text-xs font-medium text-ink underline underline-offset-4 hover:text-accent"
            >
              {t('register.signInInstead')}
            </Link>
          )}
        </div>
        <Field
          label={t('register.password')}
          hint={t('register.passwordHint', { min: PASSWORD_MIN_LENGTH })}
          error={fieldError(errors.password?.message)}
        >
          <PasswordInput autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={register.isPending}>
          {t('register.submit')}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        {t('register.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
          {t('register.signIn')}
        </Link>
      </p>
    </div>
  )
}
