import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { isApiError } from '@/lib/api/errors'
import { applyServerErrors } from '@/lib/form'
import { authApi } from '../api'
import { Callout } from '@/components/callout'
import { useErrorMessage, useFieldError } from '@/i18n'
import { registerSchema, type RegisterValues } from '../schemas'

export function RegisterPage() {
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const fieldError = useFieldError()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', merchantName: '', email: '', password: '' },
  })

  const register = useMutation({
    mutationFn: authApi.register,
    // Registration does not sign in (no token in the response), so hand off to login.
    onSuccess: (result) =>
      navigate('/login', { replace: true, state: { registeredEmail: result.user.email } }),
    onError: (error) => {
      if (isApiError(error, 'USER_EMAIL_ALREADY_EXISTS')) {
        form.setError('email', { message: 'An account with this email already exists.' })
      } else {
        applyServerErrors(error, form.setError)
      }
    },
  })

  const { errors } = form.formState
  const showBanner = register.isError && !isApiError(register.error, 'USER_EMAIL_ALREADY_EXISTS')

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight">Create a merchant account</h1>
      <p className="mt-1 text-sm text-ink-2">
        You will be the owner. Everything runs against the payment simulator.
      </p>

      {showBanner && (
        <Callout tone="danger" className="mt-6">
          {errorMessage(register.error)}
        </Callout>
      )}

      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit((v) => register.mutate(v))} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" error={fieldError(errors.firstName?.message)}>
            <Input autoComplete="given-name" autoFocus {...form.register('firstName')} />
          </Field>
          <Field label="Last name" error={fieldError(errors.lastName?.message)}>
            <Input autoComplete="family-name" {...form.register('lastName')} />
          </Field>
        </div>
        <Field
          label="Business name"
          hint="Shown on your dashboard. You can change it later."
          error={fieldError(errors.merchantName?.message)}
        >
          <Input autoComplete="organization" {...form.register('merchantName')} />
        </Field>
        <Field label="Work email" error={fieldError(errors.email?.message)}>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Password" hint="At least 8 characters." error={fieldError(errors.password?.message)}>
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={register.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
          Sign in
        </Link>
      </p>
    </div>
  )
}
