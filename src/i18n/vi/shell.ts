import type { Messages } from '../types'
import type { shell as en } from '../en/shell'

export const shell: Messages<typeof en> = {
  nav: {
    main: 'Chính',
    overview: 'Tổng quan',
    payments: 'Thanh toán',
    developers: 'Nhà phát triển',
    apiKeys: 'Khóa API',
    webhooks: 'Webhook',
    settings: 'Cài đặt',
  },
  language: {
    current: 'Ngôn ngữ: {{name}}',
    switchTo: 'Chuyển sang {{name}}',
  },
}
