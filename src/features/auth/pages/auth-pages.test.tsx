import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n'
import { configureHttp } from '@/lib/api/http'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'

type Reply = { status: number; body: unknown } | 'offline'
let reply: Reply
const fetchMock = vi.fn(async () => {
  if (reply === 'offline') throw new TypeError('Failed to fetch')
  const problem = reply.status >= 400
  return new Response(JSON.stringify(reply.body), {
    status: reply.status,
    headers: { 'Content-Type': problem ? 'application/problem+json' : 'application/json' },
  })
})

const problem = (status: number, code: string, extra: object = {}) => ({
  status,
  body: { status, code, requestId: 'req_1', ...extra },
})

/** Renders `element` at `path`, with a marker page for every place it may navigate to. */
function renderAt(element: ReactNode, path: string, state?: unknown) {
  const routes: RouteObject[] = [
    { path, element },
    { path: '/', element: <p>Overview page</p> },
    { path: '/after', element: <p>Return page</p> },
    { path: path === '/login' ? '/register' : '/login', element: <LoginMarker /> },
  ]
  const router = createMemoryRouter(routes, { initialEntries: [{ pathname: path, state }] })
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, user: userEvent.setup() }
}

function LoginMarker() {
  return <p>Other auth page</p>
}

const password = () => screen.getByLabelText('Password', { exact: true })

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => null,
    refreshAccessToken: () => Promise.reject(new Error('none')),
    onSessionExpired: () => {},
  })
})

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'viet@example.com')
  await user.type(password(), 'Secret-123')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  it('does not say which part was wrong, clears the password and focuses it', async () => {
    reply = problem(401, 'INVALID_CREDENTIALS')
    const { user } = renderAt(<LoginPage />, '/login')
    await signIn(user)

    expect(
      await screen.findByText('That email and password combination is not recognised.'),
    ).toBeInTheDocument()
    expect(password()).toHaveValue('')
    expect(password()).toHaveFocus()
    expect(screen.getByLabelText('Email')).toHaveValue('viet@example.com')
  })

  it.each([
    ['USER_LOCKED', 'This account is locked. Ask your FlowPay operator to unlock it.'],
    ['USER_DISABLED', 'This account has been disabled. Ask your FlowPay operator to enable it.'],
    ['MERCHANT_NOT_FOUND', 'This account is not linked to a merchant. Ask your FlowPay operator.'],
  ])('explains %s with a next step', async (code, message) => {
    reply = problem(code === 'MERCHANT_NOT_FOUND' ? 404 : 401, code)
    const { user } = renderAt(<LoginPage />, '/login')
    await signIn(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('says the backend is unreachable when the request never arrives', async () => {
    reply = 'offline'
    const { user } = renderAt(<LoginPage />, '/login')
    await signIn(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach FlowPay.')
  })

  it('puts server field errors on their fields, not in a banner', async () => {
    reply = problem(400, 'VALIDATION_ERROR', {
      errors: [{ field: 'email', message: 'must be a well-formed email' }],
    })
    const { user } = renderAt(<LoginPage />, '/login')
    await signIn(user)
    expect(await screen.findByText('must be a well-formed email')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('returns to the page that asked for sign-in', async () => {
    reply = {
      status: 200,
      body: {
        data: { accessToken: 'a.b.c', expiresIn: 900, user: { id: 'usr_1', email: 'viet@example.com' } },
      },
    }
    const { user } = renderAt(<LoginPage />, '/login', { from: '/after' })
    await signIn(user)
    expect(await screen.findByText('Return page')).toBeInTheDocument()
  })

  it('greets a new account and prefills its email', () => {
    renderAt(<LoginPage />, '/login', { registeredEmail: 'new@example.com' })
    expect(screen.getByText('Account created. Sign in with new@example.com.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('new@example.com')
    expect(password()).toHaveFocus()
  })
})

describe('RegisterPage', () => {
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('First name'), 'Viet')
    await user.type(screen.getByLabelText('Last name'), 'Nguyen')
    await user.type(screen.getByLabelText('Business name'), 'ABC Store')
    await user.type(screen.getByLabelText('Work email'), 'taken@example.com')
    await user.type(password(), 'Secret-123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
  }

  it('shows a taken email on the field, with a way to sign in with it', async () => {
    reply = problem(409, 'USER_EMAIL_ALREADY_EXISTS')
    const { user, router } = renderAt(<RegisterPage />, '/register')
    await fill(user)

    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Sign in with this email' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.state).toEqual({ email: 'taken@example.com' })
  })

  it('hands a new account over to sign-in', async () => {
    reply = {
      status: 201,
      body: {
        data: {
          user: { id: 'usr_1', email: 'taken@example.com', firstName: 'Viet', lastName: 'Nguyen' },
          merchant: { id: 'mrc_1', name: 'ABC Store', status: 'ACTIVE' },
        },
      },
    }
    const { user, router } = renderAt(<RegisterPage />, '/register')
    await fill(user)
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.state).toEqual({ registeredEmail: 'taken@example.com' })
  })
})

describe('RegisterPage in Vietnamese', () => {
  it('asks for the family name first, in tab order too', async () => {
    await i18n.changeLanguage('vi')
    try {
      renderAt(<RegisterPage />, '/register')
      const [first, second] = screen.getAllByRole('textbox')
      expect(first).toHaveAccessibleName('Họ')
      expect(second).toHaveAccessibleName('Tên')
      expect(first).toHaveFocus()
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})

describe('PasswordInput', () => {
  it('shows and hides the password', async () => {
    const { user } = renderAt(<LoginPage />, '/login')
    await user.type(password(), 'Secret-123')
    expect(password()).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password()).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('warns while Caps Lock is on', () => {
    renderAt(<LoginPage />, '/login')
    fireEvent.keyDown(password(), { key: 'A', modifierCapsLock: true })
    expect(screen.getByRole('status')).toHaveTextContent('Caps Lock is on.')
    fireEvent.keyUp(password(), { key: 'A', modifierCapsLock: false })
    expect(screen.queryByText('Caps Lock is on.')).not.toBeInTheDocument()
  })
})
