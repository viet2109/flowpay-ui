import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { domAnimation, LazyMotion } from 'motion/react'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from '@/lib/theme'
import { queryClient } from './query-client'
import { router } from './router'

export function App() {
  const preference = useTheme((s) => s.preference)
  return (
    <QueryClientProvider client={queryClient}>
      {/* LazyMotion + `m.*` ships only the animation features we use (~5x smaller than `motion.*`). */}
      <LazyMotion features={domAnimation} strict>
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
      </LazyMotion>
      {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  )
}
