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
  form: {
    addTitle: 'Thêm webhook endpoint',
    editTitle: 'Sửa endpoint',
    description:
      'FlowPay gửi JSON có chữ ký bằng POST tới URL này. Mỗi sự kiện được gửi ít nhất một lần: hãy loại trùng theo FlowPay-Event-Id.',
    url: 'URL của endpoint',
    urlHint: 'Môi trường production bắt buộc HTTPS. Địa chỉ nội bộ, local và metadata đều bị từ chối.',
    events: 'Sự kiện',
    selected: 'Đã chọn {{count}}/{{total}}',
    add: 'Thêm endpoint',
    save: 'Lưu thay đổi',
    updated: 'Đã cập nhật endpoint',
    createdTitle: 'Đã tạo endpoint',
    createdDescription: 'Dùng secret này để xác minh header FlowPay-Signature trên mọi yêu cầu.',
    secretLabel: 'Signing secret',
    stored: 'Tôi đã lưu lại',
  },
  picker: {
    selectAll: 'Chọn tất cả',
    clearAll: 'Bỏ chọn tất cả',
    none: 'Chưa chọn sự kiện nào',
    resource: { payment: 'Thanh toán', refund: 'Hoàn tiền' },
    outcome: { processing: 'Đang xử lý', succeeded: 'Thành công', failed: 'Thất bại' },
  },
  event: {
    payment: {
      processing: 'Đã gửi tới nhà cung cấp; chưa biết kết quả.',
      succeeded: 'Nhà cung cấp đã xác nhận khoản thanh toán.',
      failed: 'Nhà cung cấp đã từ chối khoản thanh toán.',
    },
    refund: {
      processing: 'Chưa biết kết quả hoàn tiền.',
      succeeded: 'Tiền đã được trả lại cho khách.',
      failed: 'Nhà cung cấp đã từ chối hoàn tiền.',
    },
  },
  detail: {
    title: 'Endpoint',
    edit: 'Sửa',
    moreActions: 'Thao tác khác',
    rotate: 'Xoay signing secret',
    disable: 'Tắt endpoint',
    disabledTitle: 'Endpoint này đã tắt',
    disabledBody:
      'Endpoint không còn nhận sự kiện và không thể bật lại. Cấu hình và lịch sử gửi vẫn được giữ. Hãy thêm endpoint mới để tiếp tục nhận sự kiện.',
    deliveries: 'Lượt gửi',
    deliveriesHint: 'Mới nhất trước. Lượt gửi đang chạy tự làm mới.',
    subscribed: 'Sự kiện đã đăng ký',
    notSubscribed: 'Chưa đăng ký',
    verify: 'Xác minh chữ ký',
    details: 'Chi tiết',
    created: 'Tạo lúc',
    updated: 'Cập nhật lúc',
    timeouts: 'Thời gian chờ',
    timeoutsValue: 'Mặc định 2 giây kết nối · 5 giây yêu cầu',
    redirects: 'Chuyển hướng',
    redirectsValue: 'Không bao giờ theo',
  },
  rotate: {
    title: 'Xoay signing secret?',
    body: 'Từ lần gửi tiếp theo, yêu cầu được ký bằng secret mới và secret cũ hết hiệu lực ngay: không có thời gian ân hạn. Yêu cầu đang gửi dở vẫn giữ chữ ký cũ. Hãy cập nhật máy nhận ngay sau đó.',
    confirm: 'Xoay secret',
    newTitle: 'Signing secret mới',
    newBody: 'Từ giờ các yêu cầu được ký bằng secret này.',
  },
  disable: {
    title: 'Tắt endpoint này?',
    body: 'Endpoint sẽ ngừng nhận sự kiện và không thể bật lại; hãy thêm endpoint mới để tiếp tục. Yêu cầu đang gửi dở vẫn có thể hoàn tất.',
    cancels_other: '{{count}} lượt gửi đang chờ hoặc đang thử lại sẽ bị đánh dấu hết lượt thử.',
    confirm: 'Tắt endpoint',
    done: 'Đã tắt endpoint',
  },
  health: {
    lastDelivery: 'Lần gửi gần nhất',
    noDeliveries: 'Chưa có lượt gửi nào',
    dead_other: '{{count}} lượt gửi hết lượt thử, có thể gửi lại',
    retrying_other: '{{count}} lượt gửi đang thử lại',
    unavailable: 'Không tải được tình trạng gửi',
  },
}
