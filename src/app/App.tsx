import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { domAnimation, LazyMotion, MotionConfig, useReducedMotion } from 'motion/react'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from '@/lib/theme'
import { queryClient } from './query-client'
import { router } from './router'

// Dev only, and hidden when a test browser drives the page (Playwright sets
// navigator.webdriver): its floating button covers content in review screenshots.
const showQueryDevtools = import.meta.env.DEV && typeof navigator !== 'undefined' && !navigator.webdriver

export function App() {
  const preference = useTheme((s) => s.preference)
  const reduceMotion = useReducedMotion() ?? false
  return (
    <QueryClientProvider client={queryClient}>
      {/* LazyMotion + `m.*` ships only the animation features we use (~5x smaller than `motion.*`). */}
      <LazyMotion features={domAnimation} strict>
        {/* Reduced motion jumps JS fills to their final value, like the CSS rule in globals.css.
            Motion's own `reducedMotion="user"` would still tween widths. */}
        <MotionConfig skipAnimations={reduceMotion}>
          <TooltipProvider delayDuration={300}>
            <RouterProvider router={router} />
            <Toaster
              position="bottom-right"
              theme={preference}
              toastOptions={{
                classNames: {
                  toast: '!bg-surface !border-line !text-ink !shadow-pop !rounded-lg !font-sans',
                  description: '!text-ink-2',
                  actionButton: '!bg-ink !text-ink-inverse',
                },
              }}
            />
          </TooltipProvider>
        </MotionConfig>
      </LazyMotion>
      {showQueryDevtools && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  )
}
