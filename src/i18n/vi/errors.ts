import type { errors as en } from '../en/errors'
import type { Messages } from '../types'

export const errors: Messages<typeof en> = {
  unexpected: 'Đã có lỗi xảy ra. Hãy thử lại.',
  NETWORK_ERROR: 'Không kết nối được tới FlowPay. Kiểm tra backend đang chạy.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  USER_EMAIL_ALREADY_EXISTS: 'Email này đã có tài khoản.',
  USER_LOCKED: 'Tài khoản này đang bị khóa. Hãy nhờ người vận hành FlowPay mở khóa.',
  USER_DISABLED: 'Tài khoản này đã bị vô hiệu hóa. Hãy nhờ người vận hành FlowPay kích hoạt lại.',
  MERCHANT_NOT_FOUND: 'Tài khoản này chưa gắn với merchant nào. Hãy liên hệ người vận hành FlowPay.',
  ACCESS_DENIED: 'Vai trò của bạn không được phép làm việc này. Hãy nhờ chủ tài khoản.',
  MERCHANT_SUSPENDED: 'Merchant này đang bị tạm ngưng.',
  PAYMENT_INVALID_STATE: 'Thanh toán không còn ở trạng thái cho phép thao tác này.',
  PAYMENT_NOT_FOUND: 'Tài khoản của bạn không có thanh toán nào với ID này.',
  REFUND_AMOUNT_EXCEEDS_AVAILABLE: 'Số tiền lớn hơn phần còn có thể hoàn.',
  REFUND_INVALID_PAYMENT_STATE: 'Chỉ hoàn tiền được cho thanh toán thành công hoặc đã hoàn một phần.',
  IDEMPOTENCY_KEY_REUSED: 'Yêu cầu này đã được gửi với thông tin khác.',
  IDEMPOTENCY_REQUEST_IN_PROGRESS: 'Yêu cầu giống hệt vẫn đang được xử lý. Hãy thử lại sau giây lát.',
  API_KEY_NOT_FOUND: 'Khóa này không còn tồn tại. Hãy tải lại danh sách.',
  WEBHOOK_INVALID_STATE: 'Endpoint đã thay đổi hoặc bị tắt. Tải lại trang rồi thử lại.',
  WEBHOOK_DELIVERY_NOT_FOUND: 'Tài khoản của bạn không có lượt gửi nào với ID này.',
  RATE_LIMIT_EXCEEDED: 'Quá nhiều yêu cầu. Đợi một chút rồi thử lại.',
  rateLimitedFor_other: 'Quá nhiều yêu cầu. Thử lại sau {{count}} giây.',
  INTERNAL_ERROR: 'FlowPay gặp lỗi không mong muốn.',
}
