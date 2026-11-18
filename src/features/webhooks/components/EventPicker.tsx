import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/cn'
import { EVENT_INFO } from '../catalog'
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
 * one. Row/column headers toggle a whole row or column.
 */
export function EventPicker({ value, onChange, invalid }: Props) {
  const selected = new Set(value)
  const set = (events: EventType[], on: boolean) => {
    const next = new Set(selected)
    events.forEach((e) => (on ? next.add(e) : next.delete(e)))
    onChange(EVENT_TYPES.filter((e) => next.has(e)))
  }
  const all = (events: EventType[]) => events.every((e) => selected.has(e))

  return (
    <div
      className={cn('overflow-hidden rounded-md border', invalid ? 'border-danger' : 'border-line-control')}
    >
      <div className="grid grid-cols-[6rem_repeat(3,1fr)] border-b border-line bg-surface-sunken text-xs text-ink-3">
        <button
          type="button"
          className="px-3 py-2 text-left hover:text-ink"
          onClick={() => set([...EVENT_TYPES], !all([...EVENT_TYPES]))}
        >
          {all([...EVENT_TYPES]) ? 'Clear all' : 'Select all'}
        </button>
        {OUTCOMES.map((o) => {
          const column = RESOURCES.map((r) => `${r}.${o}` as EventType)
          return (
            <button
              key={o}
              type="button"
              className="px-3 py-2 text-left capitalize hover:text-ink"
              onClick={() => set(column, !all(column))}
            >
              {o}
            </button>
          )
        })}
      </div>
      {RESOURCES.map((r) => {
        const row = OUTCOMES.map((o) => `${r}.${o}` as EventType)
        return (
          <div key={r} className="grid grid-cols-[6rem_repeat(3,1fr)] border-b border-line last:border-b-0">
            <button
              type="button"
              className="px-3 py-2.5 text-left text-sm font-medium capitalize hover:text-accent"
              onClick={() => set(row, !all(row))}
            >
              {r}
            </button>
            {row.map((event) => (
              <label
                key={event}
                title={EVENT_INFO[event].description}
                className={cn(
                  'flex cursor-pointer items-center gap-2 border-l border-line px-3 py-2.5 transition-colors hover:bg-surface-hover',
                  selected.has(event) && 'bg-accent-soft/40',
                )}
              >
                <Checkbox checked={selected.has(event)} onCheckedChange={(v) => set([event], v === true)} />
                <span className="truncate font-mono text-xs">{event}</span>
              </label>
            ))}
          </div>
        )
      })}
    </div>
  )
}
