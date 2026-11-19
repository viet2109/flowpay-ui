import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Money } from '@/components/money'
import { i18n, setLanguage, useFieldError, useFormat, vmsg } from '.'

afterEach(async () => {
  localStorage.clear()
  await act(() => i18n.changeLanguage('en'))
})

function Dates({ iso }: { iso: string }) {
  const fmt = useFormat()
  return <span data-testid="date">{fmt.dateTime(iso)}</span>
}

function FieldMessage({ message, params }: { message: string; params?: Record<string, string> }) {
  const fieldError = useFieldError()
  return <span data-testid="error">{fieldError(message, params)}</span>
}

describe('useFormat', () => {
  it('re-renders mounted values when the language changes', async () => {
    render(
      <>
        <Money amount={123456789} currency="USD" />
        <Dates iso="2026-11-19T07:05:12Z" />
      </>,
    )
    expect(screen.getByText('1,234,567.89')).toBeInTheDocument()
    expect(screen.getByTestId('date')).toHaveTextContent('19 Nov 2026, 14:05:12')

    await act(() => setLanguage('vi'))

    expect(screen.getByText('1.234.567,89')).toBeInTheDocument()
    expect(screen.getByTestId('date')).toHaveTextContent('19/11/2026 14:05:12')
  })
})

describe('useFieldError', () => {
  it('translates vmsg messages with static and render-time params, in the current language', async () => {
    render(
      <FieldMessage message={vmsg('amountInvalid')} params={{ currency: 'VND', example: '1.234.567' }} />,
    )
    expect(screen.getByTestId('error')).toHaveTextContent('Not a valid VND amount. Write it like 1.234.567.')

    await act(() => setLanguage('vi'))
    expect(screen.getByTestId('error')).toHaveTextContent(
      'Số tiền VND không hợp lệ. Viết theo dạng 1.234.567.',
    )
  })

  it('keeps static params from the schema', () => {
    render(<FieldMessage message={vmsg('tooLong', { max: 255 })} />)
    expect(screen.getByTestId('error')).toHaveTextContent('Use at most 255 characters.')
  })

  it('shows other messages (server field errors) unchanged', () => {
    render(<FieldMessage message="Must not resolve to a private address." />)
    expect(screen.getByTestId('error')).toHaveTextContent('Must not resolve to a private address.')
  })
})
