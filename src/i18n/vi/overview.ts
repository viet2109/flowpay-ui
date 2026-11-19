import type { overview as en } from '../en/overview'
import type { Messages } from '../types'

// Vietnamese has one plural form, so only the `_other` keys are needed.
export const overview: Messages<typeof en> = {
  attention: {
    title: 'Cần chú ý',
    allClear: 'Không có gì cần xử lý',
    unknownOutcome_other: 'thanh toán đang chờ kết quả chưa rõ từ nhà cung cấp',
    deadDeliveries_other: 'lượt gửi webhook hết lượt thử, có thể gửi lại',
    retrying_other: 'lượt gửi đang thử lại theo lịch',
  },
}
