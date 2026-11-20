import type { shell as en } from '../en/shell'
import type { Messages } from '../types'

export const shell: Messages<typeof en> = {
  nav: {
    main: 'Chính',
    overview: 'Tổng quan',
    payments: 'Thanh toán',
    developers: 'Nhà phát triển',
    apiKeys: 'Khóa API',
    webhooks: 'Webhook',
    settings: 'Cài đặt',
    drawerTitle: 'Điều hướng',
    drawerDescription: 'Điều hướng chính',
  },
  language: {
    current: 'Ngôn ngữ: {{name}}',
    switchTo: 'Chuyển sang {{name}}',
  },
  topbar: {
    openNavigation: 'Mở điều hướng',
    jumpTo: 'Đi tới…',
    testMode: 'Chế độ test',
    testModeKey: 'Thanh toán được đọc bằng {{key}}. Kết quả do trình mô phỏng trả về.',
    testModeNoKey: 'Mọi thanh toán đều qua trình mô phỏng. Không có tiền thật nào được chuyển.',
    toggleTheme: 'Đổi giao diện sáng/tối',
    toggleThemeShortcut: 'Đổi giao diện sáng/tối (⇧D)',
    account: 'Tài khoản',
    signOut: 'Đăng xuất',
  },
  command: {
    title: 'Bảng lệnh',
    description: 'Tìm trang hoặc dán một ID',
    placeholder: 'Tìm trang, hoặc dán ID pi_… / wep_…',
    empty: 'Không có kết quả.',
    jumpTo: 'Đi tới',
    pages: 'Trang',
    preferences: 'Tùy chọn',
    openPayment: 'Mở thanh toán',
    openEndpoint: 'Mở webhook endpoint',
    failedPayments: 'Thanh toán thất bại',
    webhookEndpoints: 'Webhook endpoint',
    deadDeliveries: 'Lượt gửi webhook hết lượt thử',
    toggleDarkMode: 'Bật/tắt chế độ tối',
  },
  notFound: {
    title: 'Trang này không tồn tại',
    body: 'Kiểm tra lại URL, hoặc dán ID thanh toán vào ô tìm kiếm ({{shortcut}}).',
    back: 'Về trang tổng quan',
  },
  unreachable: {
    title: 'FlowPay không phản hồi',
    body: 'Phiên đăng nhập chưa được kiểm tra, nên nếu bạn đang đăng nhập thì vẫn còn.',
    retry: 'Thử lại',
  },
  suspended:
    'Merchant này đang bị tạm ngưng. FlowPay từ chối các yêu cầu của merchant cho tới khi người vận hành kích hoạt lại.',
  crash: {
    eyebrow: 'Lỗi không mong muốn',
    title: 'Màn hình này gặp sự cố',
    body: 'Dữ liệu của bạn vẫn an toàn: lỗi hiển thị không thay đổi gì. Tải lại trang để thử lại.',
    reload: 'Tải lại',
  },
  auth: {
    footer: 'Trình mô phỏng FlowPay · không dùng dữ liệu thẻ thật',
    asideEyebrow: 'Ví dụ vòng đời',
    asideHeadline:
      'Một thanh toán. Mọi thay đổi trạng thái đều idempotent, mọi bút toán đều cân, mọi webhook đều được ký.',
    asideFooter: 'Bản mô phỏng. Không có tiền hay dữ liệu thẻ thật nào đi qua hệ thống này.',
  },
}
