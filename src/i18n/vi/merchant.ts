import type { Messages } from '../types'
import type { merchant as en } from '../en/merchant'

export const merchant: Messages<typeof en> = {
  settings: {
    language: {
      title: 'Ngôn ngữ',
      description: 'Áp dụng cho bảng điều khiển trên trình duyệt này. Lựa chọn được ghi nhớ.',
    },
  },
}
