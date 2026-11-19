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
  secretOnce: 'Lưu ngay vào trình quản lý bí mật của bạn. FlowPay sẽ không hiển thị lại.',
  pagination: {
    range: '{{from}}–{{to}} trên {{total}}',
    previous: 'Trang trước',
    next: 'Trang sau',
  },
  errorState: {
    title: 'Không tải được dữ liệu',
    request: 'Mã yêu cầu',
    retry: 'Thử lại',
  },
}
