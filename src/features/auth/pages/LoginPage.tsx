import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { Callout } from '@/components/callout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useErrorMessage, useFieldError } from '@/i18n'
import { isApiError } from '@/lib/api/errors'
import { applyServerErrors } from '@/lib/form'
import { authApi } from '../api'
import { loginSchema, type LoginValues } from '../schemas'
import { useSession } from '../session-store'

/** What other pages may hand over when they send someone here. */
interface LoginState {
  /** Just registered: greet and prefill. */
  registeredEmail?: string
  /** Prefill only (e.g. "Sign in with this email" from register). */
  email?: string
  /** Where to go after signing in (set by RequireAuth). */
  from?: string
}

export function LoginPage() {
  const { t } = useTranslation('auth')
  const errorMessage = useErrorMessage()
  const fieldError = useFieldError()
  const navigate = useNavigate()
  const signIn = useSession((s) => s.signIn)
  const state = (useLocation().state ?? {}) as LoginState
  const prefill = state.registeredEmail ?? state.email ?? ''

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefill, password: '' },
  })

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      signIn(result.accessToken, result.expiresIn, result.user.email)
      navigate(state.from ?? '/', { replace: true })
    },
    onError: (error) => {
      if (applyServerErrors(error, form.setError)) return
      // The backend does not say which part was wrong (it would reveal accounts),
      // so neither do we: clear the password and let the person type it again.
      if (isApiError(error, 'INVALID_CREDENTIALS')) {
        form.resetField('password')
        form.setFocus('password')
      }
    },
  })

  const { errors } = form.formState
  // Field-level validation errors are shown on their fields instead.
  const showCallout =
    login.isError && !(isApiError(login.error, 'VALIDATION_ERROR') && login.error.fieldErrors.length > 0)

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight">{t('login.title')}</h1>
      <p className="mt-1 text-sm text-ink-2">{t('login.subtitle')}</p>

      {state.registeredEmail && !login.isError && (
        <Callout tone="success" className="mt-6">
          {t('login.registered', { email: state.registeredEmail })}
        </Callout>
      )}
      {showCallout && (
        <Callout tone="danger" className="mt-6">
          {errorMessage(login.error)}
        </Callout>
      )}

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
        noValidate
      >
        <Field label={t('login.email')} error={fieldError(errors.email?.message)}>
          <Input type="email" autoComplete="email" autoFocus={!prefill} {...form.register('email')} />
        </Field>
        <Field label={t('login.password')} error={fieldError(errors.password?.message)}>
          <PasswordInput
            autoComplete="current-password"
            autoFocus={Boolean(prefill)}
            {...form.register('password')}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={login.isPending}>
          {t('login.submit')}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        {t('login.newHere')}{' '}
        <Link to="/register" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
          {t('login.createAccount')}
        </Link>
      </p>
    </div>
  )
}
