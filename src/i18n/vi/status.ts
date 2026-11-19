import type { status as en } from '../en/status'
import type { Messages } from '../types'

export const status: Messages<typeof en> = {
  payment: {
    CREATED: 'Đã tạo',
    PROCESSING: 'Đang xử lý',
    SUCCEEDED: 'Thành công',
    FAILED: 'Thất bại',
    PARTIALLY_REFUNDED: 'Hoàn một phần',
    REFUNDED: 'Đã hoàn tiền',
  },
  transaction: {
    PENDING: 'Chờ xử lý',
    PROCESSING: 'Đang xử lý',
    SUCCEEDED: 'Thành công',
    FAILED: 'Bị từ chối',
    UNKNOWN: 'Chưa rõ kết quả',
  },
  refund: {
    CREATED: 'Đã tạo',
    PROCESSING: 'Đang xử lý',
    SUCCEEDED: 'Đã hoàn tiền',
    FAILED: 'Thất bại',
  },
  delivery: {
    PENDING: 'Chờ gửi',
    DELIVERING: 'Đang gửi',
    DELIVERED: 'Đã gửi',
    RETRYING: 'Đang thử lại',
    DEAD: 'Hết lượt thử',
  },
  endpoint: {
    ACTIVE: 'Đang hoạt động',
    DISABLED: 'Đã tắt',
  },
  apiKey: {
    ACTIVE: 'Đang hoạt động',
    REVOKED: 'Đã thu hồi',
  },
  merchant: {
    ACTIVE: 'Đang hoạt động',
    SUSPENDED: 'Tạm ngưng',
    CLOSED: 'Đã đóng',
  },
}
