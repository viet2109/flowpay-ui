import type { Messages } from '../types'
import type { merchant as en } from '../en/merchant'

export const merchant: Messages<typeof en> = {
  settings: {
    title: 'Cài đặt',
    business: {
      title: 'Doanh nghiệp',
      description: 'Merchant sở hữu các thanh toán, khóa API và webhook của bạn.',
      name: 'Tên doanh nghiệp',
      save: 'Lưu',
      saved: 'Đã cập nhật tên doanh nghiệp',
      id: 'Mã merchant',
      status: 'Trạng thái',
      created: 'Tạo lúc',
    },
    account: {
      title: 'Tài khoản của bạn',
      email: 'Email',
      userId: 'Mã người dùng',
      role: 'Vai trò',
    },
    language: {
      title: 'Ngôn ngữ',
      description: 'Áp dụng cho bảng điều khiển trên trình duyệt này. Lựa chọn được ghi nhớ.',
    },
    appearance: {
      title: 'Giao diện',
      theme: 'Chủ đề',
      system: 'Theo hệ thống',
      light: 'Sáng',
      dark: 'Tối',
      shortcut: 'Phím tắt: nhấn <kbd>⇧ D</kbd> ở bất kỳ đâu để chuyển đổi.',
    },
  },
}
