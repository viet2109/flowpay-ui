import type { webhooks as en } from '../en/webhooks'
import type { Messages } from '../types'

// Vietnamese has one plural form, so only the `_other` keys are needed.
export const webhooks: Messages<typeof en> = {
  title: 'Webhook',
  description:
    'Nhận thông báo khi thanh toán và hoàn tiền đổi trạng thái. Mỗi yêu cầu được ký bằng HMAC-SHA256.',
  addEndpoint: 'Thêm endpoint',
  deliveriesDescription: 'Mọi lần FlowPay gửi tới endpoint của bạn, kèm toàn bộ lịch sử thử lại.',
  tabs: {
    label: 'Webhook',
    endpoints: 'Endpoint',
    deliveries: 'Lượt gửi',
  },
  empty: {
    title: 'Chưa có endpoint nào',
    body: 'Trỏ FlowPay tới một URL trên máy chủ của bạn để nhận sự kiện thanh toán và hoàn tiền.',
    action: 'Thêm endpoint đầu tiên',
  },
  endpoint: {
    events_other: '{{count}} sự kiện',
    updated: 'cập nhật',
    disabled: 'Không còn nhận sự kiện',
  },
  health: {
    lastDelivery: 'Lần gửi gần nhất',
    noDeliveries: 'Chưa có lượt gửi nào',
    dead_other: '{{count}} lượt gửi hết lượt thử, có thể gửi lại',
    retrying_other: '{{count}} lượt gửi đang thử lại',
    unavailable: 'Không tải được tình trạng gửi',
  },
}
