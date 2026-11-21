import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/cn'
import { EVENT_TYPES, type EventType } from '../types'

const OUTCOMES = ['processing', 'succeeded', 'failed'] as const
const RESOURCES = ['payment', 'refund'] as const

interface Props {
  value: EventType[]
  onChange: (events: EventType[]) => void
  invalid?: boolean
}

/**
 * The six events are a 2×3 matrix (resource × outcome), so they're laid out as
 * one. Row/column headers toggle a whole row or column. A cell only holds its
 * checkbox (named with the event, e.g. "payment.succeeded"), so the matrix fits a
 * phone; the exact event names a handler switches on are listed underneath.
 */
export function EventPicker({ value, onChange, invalid }: Props) {
  const { t } = useTranslation('webhooks')
  const selected = new Set(value)
  const set = (events: EventType[], on: boolean) => {
    const next = new Set(selected)
    events.forEach((e) => (on ? next.add(e) : next.delete(e)))
    onChange(EVENT_TYPES.filter((e) => next.has(e)))
  }
  const all = (events: EventType[]) => events.every((e) => selected.has(e))
  const columns = 'grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]'

  return (
    <div
      className={cn('overflow-hidden rounded-md border', invalid ? 'border-danger' : 'border-line-control')}
    >
      <div className={cn(columns, 'border-b border-line bg-surface-sunken text-xs text-ink-3')}>
        <button
          type="button"
          className="px-3 py-2 text-left leading-tight hover:text-ink"
          onClick={() => set([...EVENT_TYPES], !all([...EVENT_TYPES]))}
        >
          {all([...EVENT_TYPES]) ? t('picker.clearAll') : t('picker.selectAll')}
        </button>
        {OUTCOMES.map((o) => {
          const column = RESOURCES.map((r) => `${r}.${o}` as EventType)
          return (
            <button
              key={o}
              type="button"
              className="border-l border-line px-1.5 py-2 text-center leading-tight hover:text-ink"
              onClick={() => set(column, !all(column))}
            >
              {t(`picker.outcome.${o}`)}
            </button>
          )
        })}
      </div>
      {RESOURCES.map((r) => {
        const row = OUTCOMES.map((o) => `${r}.${o}` as EventType)
        return (
          <div key={r} className={cn(columns, 'border-b border-line')}>
            <button
              type="button"
              className="px-3 py-2.5 text-left text-sm leading-tight font-medium hover:text-accent"
              onClick={() => set(row, !all(row))}
            >
              {t(`picker.resource.${r}`)}
            </button>
            {row.map((event) => (
              <label
                key={event}
                title={t(`event.${event}`)}
                className={cn(
                  'flex cursor-pointer items-center justify-center border-l border-line py-2.5 transition-colors hover:bg-surface-hover',
                  selected.has(event) && 'bg-accent-soft/40',
                )}
              >
                <Checkbox
                  aria-label={event}
                  checked={selected.has(event)}
                  onCheckedChange={(v) => set([event], v === true)}
                />
              </label>
            ))}
          </div>
        )
      })}
      <p className="px-3 py-2 font-mono text-xs break-words text-ink-2" aria-live="polite">
        {value.length > 0 ? (
          value.join(' · ')
        ) : (
          <span className="font-sans text-ink-3">{t('picker.none')}</span>
        )}
      </p>
    </div>
  )
}
