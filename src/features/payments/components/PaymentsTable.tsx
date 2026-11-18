import { useNavigate } from 'react-router'
import { CopyableId } from '@/components/copyable-id'
import { Money } from '@/components/money'
import { RelativeTime } from '@/components/relative-time'
import { StatusBadge } from '@/components/status-badge'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { paymentStatus } from '../status'
import type { PaymentIntent } from '../types'

export function PaymentsTable({ payments, compact }: { payments: PaymentIntent[]; compact?: boolean }) {
  const navigate = useNavigate()
  const open = (id: string) => navigate(`/payments/${id}`)

  return (
    <Table>
      <THead>
        <tr>
          <Th className="text-right">Amount</Th>
          <Th>Status</Th>
          <Th>Order</Th>
          {!compact && <Th className="hidden lg:table-cell">Description</Th>}
          <Th className="hidden md:table-cell">Payment ID</Th>
          <Th className="text-right">Created</Th>
        </tr>
      </THead>
      <TBody>
        {payments.map((payment) => {
          const status = paymentStatus[payment.status]
          return (
            <Tr
              key={payment.id}
              interactive
              tabIndex={0}
              onClick={() => open(payment.id)}
              onKeyDown={(e) => e.key === 'Enter' && open(payment.id)}
            >
              <Td className="w-0 text-right font-medium">
                <Money amount={payment.amount} currency={payment.currency} size="sm" />
              </Td>
              <Td className="w-0">
                <StatusBadge {...status} />
              </Td>
              <Td className="max-w-48 truncate text-ink-2">
                {payment.orderId ?? <span className="text-ink-3">—</span>}
              </Td>
              {!compact && (
                <Td className="hidden max-w-72 truncate text-ink-3 lg:table-cell">{payment.description}</Td>
              )}
              <Td className="hidden md:table-cell">
                <CopyableId value={payment.id} />
              </Td>
              <Td className="text-right text-ink-3">
                <RelativeTime value={payment.createdAt} />
              </Td>
            </Tr>
          )
        })}
      </TBody>
    </Table>
  )
}
