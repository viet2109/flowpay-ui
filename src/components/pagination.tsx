import { useTranslation } from 'react-i18next'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useFormat } from '@/i18n'
import type { PageMeta } from '@/lib/api/types'
import { Button } from './ui/button'

interface PaginationProps {
  meta: PageMeta
  onPageChange: (page: number) => void
  /** Dims the controls while the next page is fetching. */
  pending?: boolean
}

export function Pagination({ meta, onPageChange, pending }: PaginationProps) {
  const { t } = useTranslation('common')
  const fmt = useFormat()
  if (meta.totalElements === 0) return null
  const from = meta.page * meta.size + 1
  const to = Math.min(from + meta.size - 1, meta.totalElements)

  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-sm text-ink-2">
      <span className="num">
        {t('pagination.range', {
          from: fmt.number(from),
          to: fmt.number(to),
          total: fmt.number(meta.totalElements),
        })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={!meta.hasPrevious || pending}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label={t('pagination.previous')}
        >
          <CaretLeftIcon />
        </Button>
        <span className="num px-1 text-xs text-ink-3">
          {meta.page + 1} / {Math.max(meta.totalPages, 1)}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={!meta.hasNext || pending}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label={t('pagination.next')}
        >
          <CaretRightIcon />
        </Button>
      </div>
    </div>
  )
}
