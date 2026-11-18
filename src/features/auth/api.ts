import { request } from '@/lib/api/http'

/** docs/api-contract.md §7. All auth calls are cookie based and send the CSRF marker. */
export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  firstName: string
  lastName: string
  merchantName: string
}

export interface LoginResult {
  accessToken: string
  expiresIn: number
  user: { id: string; email: string }
}

export interface RefreshResult {
  accessToken: string
  expiresIn: number
}

export interface RegisterResult {
  user: { id: string; email: string; firstName: string; lastName: string }
  merchant: { id: string; name: string; status: string }
}

export const authApi = {
  login: (input: LoginInput) =>
    request<LoginResult>('/auth/login', { method: 'POST', auth: 'none', body: input }).then((r) => r.data),

  register: (input: RegisterInput) =>
    request<RegisterResult>('/auth/register', { method: 'POST', auth: 'none', body: input }).then(
      (r) => r.data,
    ),

  refresh: () =>
    request<RefreshResult>('/auth/refresh', { method: 'POST', auth: 'none' }).then((r) => r.data),

  logout: () => request<void>('/auth/logout', { method: 'POST', auth: 'none' }),
}
