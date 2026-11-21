import type { apiKeys as en } from '../en/apiKeys'
import type { Messages } from '../types'

export const apiKeys: Messages<typeof en> = {
  title: 'Khóa API',
  description:
    'Khóa bí mật cho các lệnh gọi giữa máy chủ với nhau. Đừng bao giờ đưa chúng vào trình duyệt hay ứng dụng di động.',
  create: 'Tạo khóa',
  usage:
    'Yêu cầu xác thực bằng <code>Authorization: Bearer fp_test_…</code>. Thu hồi khóa là vĩnh viễn và có hiệu lực từ yêu cầu tiếp theo.',
  empty: {
    title: 'Chưa có khóa API nào',
    body: 'Tạo khóa để gọi Payment API từ backend của bạn, hoặc để xem thanh toán trong dashboard này.',
    action: 'Tạo khóa đầu tiên',
  },
  columns: {
    name: 'Tên',
    key: 'Khóa',
    status: 'Trạng thái',
    id: 'ID',
    created: 'Tạo lúc',
  },
  connected: 'Đang kết nối với tab dashboard này',
  revoke: 'Thu hồi',
  revokeTitle: 'Thu hồi “{{name}}”?',
  revokeBody:
    'Backend nào còn dùng khóa này sẽ nhận 401 API_KEY_REVOKED ở yêu cầu tiếp theo. Khóa đã thu hồi không thể khôi phục.',
  revokeConfirm: 'Thu hồi khóa',
  revoked: 'Đã thu hồi “{{name}}”',
  form: {
    title: 'Tạo khóa API',
    description: 'Khóa dùng để backend của bạn xác thực với Payment API và Refund API.',
    name: 'Tên',
    nameHint: 'Mô tả nơi sẽ dùng khóa, ví dụ “Checkout service – staging”.',
    cancel: 'Hủy',
    submit: 'Tạo khóa',
    createdTitle: 'Sao chép khóa mới',
    createdDescription: '“{{name}}” đang hoạt động. Dùng nó làm Bearer token từ backend của bạn.',
    secretLabel: 'Khóa bí mật',
    stored: 'Tôi đã lưu khóa',
    useInDashboard: 'Dùng trong dashboard',
    connectHint: 'Kết nối khóa này để tab này hiển thị được thanh toán và hoàn tiền.',
    replaceHint: 'Thay khóa đang kết nối để tab này hiển thị được thanh toán và hoàn tiền.',
    connectedToast: 'Đã kết nối khóa với tab dashboard này',
  },
}
