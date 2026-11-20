import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { useSession } from '@/features/auth'
import { GuestOnly } from './guards'

const claims = btoa(JSON.stringify({ sub: 'usr_1', merchant: 'mrc_1', role: 'OWNER', exp: 9999999999 }))

afterEach(() => useSession.getState().signOut())

describe('GuestOnly', () => {
  it('sends a newly signed-in person back to the page that asked for sign-in', async () => {
    useSession.getState().signOut()
    const router = createMemoryRouter(
      [
        { element: <GuestOnly />, children: [{ path: '/login', element: <p>Sign-in form</p> }] },
        { path: '/', element: <p>Overview</p> },
        { path: '/developers/webhooks', element: <p>Webhooks</p> },
      ],
      { initialEntries: [{ pathname: '/login', state: { from: '/developers/webhooks' } }] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByText('Sign-in form')).toBeInTheDocument()

    // Signing in (here or in another tab) re-renders the guard; it must not send everyone to "/".
    await act(() => useSession.getState().signIn(`h.${claims}.s`, 900))
    expect(await screen.findByText('Webhooks')).toBeInTheDocument()
  })
})
