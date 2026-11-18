import { m, type Variants } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'
import type { ReactNode } from 'react'

/**
 * The auth screen's right-hand panel. Instead of a stock illustration it shows
 * what FlowPay actually does with one payment: state machine, provider attempt,
 * balanced ledger posting (BR-LED-006) and a signed webhook. Values are an example.
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
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[#141412] p-10 text-[#d9d6cf]">
      <div className="hatch-sim absolute inset-x-0 top-0 h-1" />

      <div className="max-w-md">
        <p className="font-mono text-2xs tracking-widest text-[#8a857a] uppercase">Example lifecycle</p>
        <p className="mt-3 text-xl leading-snug font-medium text-[#f3f1ec]">
          One payment. Every state change idempotent, every posting balanced, every webhook signed.
        </p>
      </div>

      <div className="num space-y-6 font-mono text-xs leading-6">
        <section>
          <Row i={0} className="flex justify-between border-b border-white/10 pb-2 text-[#f3f1ec]">
            <span>
              <span className="text-[#8a857a]">pi_</span>01KAR7Q9XW
            </span>
            <span>
              500,000 <span className="text-[#8a857a]">VND</span>
            </span>
          </Row>
          <Row i={1} className="mt-2 grid grid-cols-[1rem_8rem_1fr] items-center">
            <Dot className="bg-[#8a857a]" />
            <span>CREATED</span>
            <span className="text-[#8a857a]">03:00:00.112</span>
          </Row>
          <Row i={2} className="grid grid-cols-[1rem_8rem_1fr] items-center">
            <Dot className="bg-[#edb35b]" />
            <span>PROCESSING</span>
            <span className="text-[#8a857a]">attempt #1 · SIMULATOR</span>
          </Row>
          <Row i={3} className="grid grid-cols-[1rem_8rem_1fr] items-center">
            <Dot className="bg-[#5fc896]" />
            <span className="text-[#5fc896]">SUCCEEDED</span>
            <span className="text-[#8a857a]">03:00:00.601</span>
          </Row>
        </section>

        <section>
          <Row i={4} className="text-[#8a857a]">
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
          <Row i={7} className="mt-1 flex justify-end gap-2 border-t border-white/10 pt-1 text-[#5fc896]">
            Σ debit = Σ credit
          </Row>
        </section>

        <section>
          <Row i={8} className="text-[#8a857a]">
            webhook · FlowPay-Signature: t=…,v1=…
          </Row>
          <Row i={9} className="flex justify-between">
            <span>POST abc.store/hooks/flowpay</span>
            <span>
              <span className="text-[#5fc896]">200</span> · 84 ms
            </span>
          </Row>
        </section>
      </div>

      <p className="text-xs text-[#8a857a]">
        Simulator build. No real money or card data moves through this system.
      </p>
    </div>
  )
}
