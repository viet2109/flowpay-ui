import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StatusBadge } from '@/components/status-badge'
import { ApiError } from '@/lib/api/errors'
import { i18n, setLanguage, useErrorMessage } from '.'

afterEach(async () => {
  localStorage.clear()
  await act(() => i18n.changeLanguage('en'))
})

describe('plural forms', () => {
  it('picks singular and plural in English', () => {
    expect(i18n.t('attention.processing', { ns: 'overview', count: 1 })).toBe(
      'payment awaiting the provider’s outcome',
    )
    expect(i18n.t('attention.processing', { ns: 'overview', count: 3 })).toBe(
      'payments awaiting the provider’s outcome',
    )
  })

  it('uses the single Vietnamese form for any count', async () => {
    await i18n.changeLanguage('vi')
    for (const count of [0, 1, 7])
      expect(i18n.t('attention.retrying', { ns: 'overview', count })).toBe('lượt gửi đang thử lại theo lịch')
  })
})

function Message({ error }: { error: unknown }) {
  const errorMessage = useErrorMessage()
  return <p>{errorMessage(error)}</p>
}

describe('useErrorMessage', () => {
  it('translates by code, in the current language', async () => {
    render(<Message error={new ApiError({ status: 409, code: 'IDEMPOTENCY_KEY_REUSED', detail: 'raw' })} />)
    expect(screen.getByText('This request was already sent with different details.')).toBeInTheDocument()

    await act(() => setLanguage('vi'))
    expect(screen.getByText('Yêu cầu này đã được gửi với thông tin khác.')).toBeInTheDocument()
  })

  it("shows the server's message for a code without copy", () => {
    render(
      <Message error={new ApiError({ status: 400, code: 'SOMETHING_NEW', detail: 'Server explains.' })} />,
    )
    expect(screen.getByText('Server explains.')).toBeInTheDocument()
  })

  it('never shows a raw JavaScript error', () => {
    render(<Message error={new TypeError('x is undefined')} />)
    expect(screen.getByText('Something went wrong. Try again.')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('translates its label and follows a language change', async () => {
    render(<StatusBadge tone="warning" label="transaction.UNKNOWN" />)
    expect(screen.getByText('Outcome unknown')).toBeInTheDocument()

    await act(() => setLanguage('vi'))
    expect(screen.getByText('Chưa rõ kết quả')).toBeInTheDocument()
  })
})
