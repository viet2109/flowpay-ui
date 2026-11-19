import { useTranslation } from 'react-i18next'
import { m, type Variants } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'
import type { ReactNode } from 'react'

/**
 * The auth screen's right-hand panel. Instead of a stock illustration it shows
 * what FlowPay actually does with one payment: state machine, provider attempt,
 * balanced ledger posting (BR-LED-006) and a signed webhook. Values are an example.
 *
 * The panel is dark in both themes: the `dark` class on its root switches the
 * tokens inside it to their dark values, so it needs no raw colours. Its left
 * border keeps the split visible when the page itself is dark.
 */
const line = {
  hidden: { opacity: 0, y: 4 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.25 + i * 0.12, duration: 0.4, ease: EASE_OUT },
  }),
} satisfies Variants

function Row({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
  return (
    <m.div custom={i} variants={line} initial="hidden" animate="show" className={className}>
      {children}
    </m.div>
  )
}

function Dot({ className }: { className: string }) {
  return <span className={`inline-block size-1.5 rounded-full ${className}`} />
}

export function AuthAside() {
  const { t } = useTranslation('shell')
  return (
    <div className="dark relative flex h-full flex-col justify-between overflow-hidden border-l border-line bg-surface-sunken p-10 text-ink">
      <div className="hatch-sim absolute inset-x-0 top-0 h-1" />

      <div className="max-w-md">
        <p className="font-mono text-2xs tracking-widest text-ink-3 uppercase">{t('auth.asideEyebrow')}</p>
        <p className="mt-3 text-xl leading-snug font-medium text-ink">{t('auth.asideHeadline')}</p>
      </div>

      <div className="num space-y-6 font-mono text-xs leading-6">
        <section>
          <Row i={0} className="flex justify-between border-b border-line pb-2 text-ink">
            <span>
              <span className="text-ink-3">pi_</span>01KAR7Q9XW
            </span>
            <span>
              500,000 <span className="text-ink-3">VND</span>
            </span>
          </Row>
          <Row i={1} className="mt-2 grid grid-cols-[1rem_8rem_1fr] items-center">
            <Dot className="bg-ink-3" />
            <span>CREATED</span>
            <span className="text-ink-3">03:00:00.112</span>
          </Row>
          <Row i={2} className="grid grid-cols-[1rem_8rem_1fr] items-center">
            <Dot className="bg-warning" />
            <span>PROCESSING</span>
            <span className="text-ink-3">attempt #1 · SIMULATOR</span>
          </Row>
          <Row i={3} className="grid grid-cols-[1rem_8rem_1fr] items-center">
            <Dot className="bg-success" />
            <span className="text-success">SUCCEEDED</span>
            <span className="text-ink-3">03:00:00.601</span>
          </Row>
        </section>

        <section>
          <Row i={4} className="text-ink-3">
            ledger posting · payment.succeeded
          </Row>
          <Row i={5} className="grid grid-cols-[4rem_1fr_auto]">
            <span>DEBIT</span>
            <span>SYSTEM_CLEARING</span>
            <span>500,000</span>
          </Row>
          <Row i={6} className="grid grid-cols-[4rem_1fr_auto]">
            <span>CREDIT</span>
            <span>MERCHANT_PAYABLE</span>
            <span>500,000</span>
          </Row>
          <Row i={7} className="mt-1 flex justify-end gap-2 border-t border-line pt-1 text-success">
            Σ debit = Σ credit
          </Row>
        </section>

        <section>
          <Row i={8} className="text-ink-3">
            webhook · FlowPay-Signature: t=…,v1=…
          </Row>
          <Row i={9} className="flex justify-between">
            <span>POST abc.store/hooks/flowpay</span>
            <span>
              <span className="text-success">200</span> · 84 ms
            </span>
          </Row>
        </section>
      </div>

      <p className="text-xs text-ink-3">{t('auth.asideFooter')}</p>
    </div>
  )
}
