/**
 * Motion tokens shared by JS animations (motion/react). CSS uses --ease-out-quint.
 * One curve everywhere keeps the UI feeling like one product.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  /** For things that visualise a quantity filling up (bars, rails). */
  fill: 0.6,
} as const
