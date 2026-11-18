import { z } from 'zod'

// Mirrors backend validation (LoginRequest / RegisterRequest) so errors show before a round trip.
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').max(320).pipe(z.email('Enter a valid email.')),
  password: z.string().min(1, 'Password is required.'),
})

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Required.').max(100),
  lastName: z.string().trim().min(1, 'Required.').max(100),
  merchantName: z.string().trim().min(1, 'Your business name is required.').max(200),
  email: z.string().trim().min(1, 'Email is required.').max(320).pipe(z.email('Enter a valid email.')),
  password: z.string().min(8, 'Use at least 8 characters.'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
