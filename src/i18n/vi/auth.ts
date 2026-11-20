import type { auth as en } from '../en/auth'
import type { Messages } from '../types'

export const auth: Messages<typeof en> = {
  login: {
    title: 'Đăng nhập',
    subtitle: 'Quản lý thanh toán, khóa API và webhook cho doanh nghiệp của bạn.',
    email: 'Email',
    password: 'Mật khẩu',
    submit: 'Đăng nhập',
    registered: 'Đã tạo tài khoản. Đăng nhập bằng {{email}}.',
    endedExpired: 'Phiên đăng nhập đã kết thúc. Đăng nhập lại để tiếp tục từ chỗ đang làm.',
    endedElsewhere: 'Bạn đã đăng xuất ở một tab khác.',
    newHere: 'Lần đầu dùng FlowPay?',
    createAccount: 'Tạo tài khoản merchant',
  },
  register: {
    title: 'Tạo tài khoản merchant',
    subtitle: 'Bạn sẽ là chủ sở hữu. Mọi thứ chạy trên trình mô phỏng thanh toán.',
    firstName: 'Tên',
    lastName: 'Họ',
    businessName: 'Tên doanh nghiệp',
    businessNameHint: 'Hiển thị trên bảng điều khiển. Có thể đổi sau.',
    email: 'Email công việc',
    password: 'Mật khẩu',
    passwordHint: 'Ít nhất {{min}} ký tự.',
    submit: 'Tạo tài khoản',
    haveAccount: 'Đã có tài khoản?',
    signIn: 'Đăng nhập',
    signInInstead: 'Đăng nhập bằng email này',
  },
}
