import { useTranslation } from 'react-i18next'
import { useFormat } from '@/i18n'
import { cn } from '@/lib/cn'
import { attemptOutcome, attemptTone, knownDiagnostic, MAX_AUTOMATIC_ATTEMPTS } from '../catalog'
import type { DeliveryAttempt } from '../types'
import { HttpResult } from './DeliveriesTable'

const dotClass = {
  progress: 'bg-progress',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
} as const

const codeClass = { danger: 'text-danger', warning: 'text-warning' } as const

/** Attempts oldest first, as the API orders them (attemptNo ASC). */
export function AttemptTimeline({ attempts }: { attempts: DeliveryAttempt[] }) {
  return (
    <ol className="relative border-l border-line pl-4">
      {attempts.map((attempt) => (
        <AttemptRow key={attempt.attemptNo} attempt={attempt} />
      ))}
    </ol>
  )
}

function AttemptRow({ attempt }: { attempt: DeliveryAttempt }) {
  const { t } = useTranslation('webhooks')
  const fmt = useFormat()
  const outcome = attemptOutcome(attempt)
  const tone = attemptTone[outcome]
  const diagnostic = knownDiagnostic(attempt.errorMessage)

  return (
    <li className="relative pb-4 last:pb-0">
      <span
        className={cn(
          'absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-surface',
          dotClass[tone],
        )}
      />
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">
          {t('sheet.attempt')} <span className="num">#{attempt.attemptNo}</span>
          {/* Attempts past the automatic budget only come from manual retries. */}
          {attempt.attemptNo > MAX_AUTOMATIC_ATTEMPTS && (
            <span className="ml-2 text-xs text-ink-3">{t('attempts.manual')}</span>
          )}
        </span>
        <span className="num text-xs text-ink-3">{fmt.dateTime(attempt.startedAt)}</span>
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
        {outcome === 'in-flight' ? (
          <span className="text-progress">{t('attempts.inFlight')}</span>
        ) : outcome === 'unknown' ? (
          <span className="text-warning">{t('attempts.unknown')}</span>
        ) : attempt.httpStatus !== null ? (
          <HttpResult status={attempt.httpStatus} />
        ) : null}
        {attempt.errorMessage && attempt.httpStatus === null && (
          <span
            className={cn('font-mono break-all', tone === 'warning' ? codeClass.warning : codeClass.danger)}
          >
            {attempt.errorMessage}
          </span>
        )}
        {/* Unknown for in-flight and lease-expired attempts: never shown as 0 ms. */}
        {attempt.durationMs !== null && (
          <>
            <span aria-hidden>·</span>
            <span className="num">{fmt.duration(attempt.durationMs)}</span>
          </>
        )}
      </div>
      {diagnostic && <p className="mt-1 text-xs text-ink-2">{t(`diagnostic.${diagnostic}`)}</p>}
    </li>
  )
}
