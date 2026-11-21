import type { common as en } from '../en/common'
import type { Messages } from '../types'

export const common: Messages<typeof en> = {
  close: 'Đóng',
  details: 'Chi tiết',
  loading: 'Đang tải',
  cancel: 'Hủy',
  copy: 'Sao chép',
  copied: 'Đã sao chép',
  copyValue: 'Sao chép {{value}}',
  show: 'Hiện',
  hide: 'Ẩn',
  password: {
    show: 'Hiện mật khẩu',
    hide: 'Ẩn mật khẩu',
    capsLock: 'Caps Lock đang bật.',
  },
  secretOnce: 'Lưu ngay vào trình quản lý bí mật của bạn. FlowPay sẽ không hiển thị lại.',
  pagination: {
    range: '{{from}}–{{to}} trên {{total}}',
    previous: 'Trang trước',
    next: 'Trang sau',
    pageSize: 'Số dòng mỗi trang',
  },
  refreshFailed: 'Không làm mới được. Dữ liệu đang hiển thị có thể đã cũ.',
  errorState: {
    title: 'Không tải được dữ liệu',
    request: 'Mã yêu cầu',
    retry: 'Thử lại',
  },
}
