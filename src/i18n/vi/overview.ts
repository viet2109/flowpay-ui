import type { overview as en } from '../en/overview'
import type { Messages } from '../types'

// Vietnamese has one plural form, so only the `_other` keys are needed.
export const overview: Messages<typeof en> = {
  title: 'Tổng quan',
  description: 'Việc cần chú ý và tình hình thanh toán, webhook.',
  setup: {
    title: 'Bắt đầu',
    description: 'Xem trọn luồng thanh toán, sổ cái và webhook với trình mô phỏng.',
    progress: 'Đã xong {{done}}/{{total}}',
    apiKey: 'Tạo khóa API cho backend của bạn',
    endpoint: 'Thêm một webhook endpoint',
    payment: 'Tạo thanh toán test đầu tiên',
  },
  attention: {
    title: 'Cần chú ý',
    allClear: 'Không có gì cần xử lý',
    processing_other: 'thanh toán đang chờ kết quả từ nhà cung cấp',
    deadDeliveries_other: 'lượt gửi webhook hết lượt thử, có thể gửi lại',
    retrying_other: 'lượt gửi đang thử lại theo lịch',
    someFailed: 'Một số số liệu không tải được, nên danh sách này có thể chưa đủ.',
    retry: 'Thử lại',
  },
  deliveries: {
    title: 'Lượt gửi webhook',
    description: 'Từ trước tới nay, theo trạng thái hiện tại.',
  },
  payments: {
    title: 'Thanh toán theo trạng thái',
    description: 'Mọi thanh toán của merchant này.',
  },
  recent: {
    title: 'Thanh toán gần đây',
    viewAll: 'Xem tất cả',
    empty: 'Chưa có thanh toán nào.',
  },
  empty: 'Chưa có gì ở đây.',
}
