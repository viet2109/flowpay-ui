import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/api/errors'
import { authApi } from '../api'
import { Callout } from '@/components/callout'
import { loginSchema, type LoginValues } from '../schemas'
import { useSession } from '../session-store'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useSession((s) => s.signIn)
  const registeredEmail = (location.state as { registeredEmail?: string } | null)?.registeredEmail
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: registeredEmail ?? '', password: '' },
  })

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      signIn(result.accessToken, result.expiresIn, result.user.email)
      navigate(from, { replace: true })
    },
  })

  const { errors } = form.formState

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-ink-2">Manage payments, keys and webhooks for your business.</p>

      {registeredEmail && !login.isError && (
        <Callout tone="success" className="mt-6">
          Account created. Sign in with <strong className="font-medium">{registeredEmail}</strong>.
        </Callout>
      )}
      {login.isError && (
        <Callout tone="danger" className="mt-6">
          {errorMessage(login.error)}
        </Callout>
      )}

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
        noValidate
      >
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" autoFocus={!registeredEmail} {...form.register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            autoFocus={Boolean(registeredEmail)}
            {...form.register('password')}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        New to FlowPay?{' '}
        <Link to="/register" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
          Create a merchant account
        </Link>
      </p>
    </div>
  )
}
