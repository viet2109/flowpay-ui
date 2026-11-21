import type { payments as en } from '../en/payments'
import type { Messages } from '../types'

export const payments: Messages<typeof en> = {
  title: 'Thanh toán',
  description: 'Mọi thanh toán của merchant này, từ backend của bạn hoặc từ dashboard, mới nhất trước.',
  newPayment: 'Tạo thanh toán test',
  filters: {
    status: 'Lọc theo trạng thái',
    all: 'Tất cả',
    orderId: 'Mã đơn hàng',
    orderIdPlaceholder: 'Mã đơn hàng chính xác',
    from: 'Tạo từ ngày',
    to: 'Tạo đến ngày',
    rangeSeparator: 'đến',
    clear: 'Xóa bộ lọc',
    rangeInverted: 'Ngày bắt đầu nằm sau ngày kết thúc. Khoảng ngày chưa được áp dụng cho tới khi sửa lại.',
  },
  columns: {
    amount: 'Số tiền',
    status: 'Trạng thái',
    order: 'Đơn hàng',
    description: 'Mô tả',
    id: 'Mã thanh toán',
    created: 'Tạo lúc',
  },
  empty: {
    title: 'Chưa có thanh toán nào',
    body: 'Thanh toán sẽ hiện ở đây khi backend của bạn gọi <code>POST /payment-intents</code>, hoặc khi bạn tạo từ dashboard.',
    action: 'Tạo thanh toán test',
  },
  filtered: {
    title: 'Không có thanh toán nào khớp bộ lọc',
    body: 'Mã đơn hàng phải khớp chính xác. Ngày tính theo múi giờ của bạn.',
  },
  pastEnd: {
    title: 'Trang này nằm sau thanh toán cuối cùng',
    body: 'Danh sách ngắn hơn so với liên kết.',
    action: 'Về trang đầu',
  },
}
