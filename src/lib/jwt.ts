/**
 * Reads (does not verify) dashboard JWT claims for display purposes only.
 * The backend is the only authority on whether a token is valid.
 */
export interface DashboardClaims {
  sub: string
  merchant: string
  role: string
  exp: number
}

export function decodeClaims(token: string): DashboardClaims | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as DashboardClaims
  } catch {
    return null
  }
}
