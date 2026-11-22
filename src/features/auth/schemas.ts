import { z } from '@/lib/zod'
import { vmsg } from '@/i18n'

export const PASSWORD_MIN_LENGTH = 8

const email = z
  .string()
  .trim()
  .min(1, vmsg('emailRequired'))
  .max(320, vmsg('tooLong', { max: 320 }))
  .pipe(z.email(vmsg('email')))

// Mirrors backend validation (LoginRequest / RegisterRequest) so errors show before a round trip.
export const loginSchema = z.object({
  email,
  password: z.string().min(1, vmsg('passwordRequired')),
})

export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, vmsg('required'))
    .max(100, vmsg('tooLong', { max: 100 })),
  lastName: z
    .string()
    .trim()
    .min(1, vmsg('required'))
    .max(100, vmsg('tooLong', { max: 100 })),
  merchantName: z
    .string()
    .trim()
    .min(1, vmsg('businessNameRequired'))
    .max(200, vmsg('tooLong', { max: 200 })),
  email,
  password: z.string().min(PASSWORD_MIN_LENGTH, vmsg('passwordTooShort', { min: PASSWORD_MIN_LENGTH })),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
