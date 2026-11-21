import type { validation as en } from '../en/validation'
import type { Messages } from '../types'

export const validation: Messages<typeof en> = {
  required: 'Bắt buộc.',
  tooLong: 'Tối đa {{max}} ký tự.',
  emailRequired: 'Vui lòng nhập email.',
  email: 'Email không hợp lệ.',
  passwordRequired: 'Vui lòng nhập mật khẩu.',
  passwordTooShort: 'Mật khẩu cần ít nhất {{min}} ký tự.',
  businessNameRequired: 'Vui lòng nhập tên doanh nghiệp.',
  emailTaken: 'Email này đã có tài khoản.',
  currency: 'Dùng mã tiền tệ 3 chữ cái.',
  amountRequired: 'Vui lòng nhập số tiền.',
  amountInvalid: 'Số tiền {{currency}} không hợp lệ. Viết theo dạng {{example}}.',
  amountPositive: 'Số tiền phải lớn hơn 0.',
  amountAboveRefundable: 'Chỉ có thể hoàn tối đa {{amount}} {{currency}}.',
  urlRequired: 'Nhập URL sẽ nhận sự kiện.',
  urlScheme: 'Dùng URL https://.',
  urlFragment: 'Bỏ phần #fragment.',
  urlCredentials: 'URL không được chứa thông tin đăng nhập.',
  urlRejected:
    'FlowPay không gửi tới địa chỉ này. Hãy dùng URL công khai; địa chỉ nội bộ, local và metadata đều bị từ chối.',
  urlInvalid: 'URL không hợp lệ.',
  eventsRequired: 'Chọn ít nhất một sự kiện.',
}
