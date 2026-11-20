import { useEffect } from 'react'

/** "Payments · FlowPay" in the browser tab (WCAG 2.4.2), so tabs and history read clearly. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · FlowPay` : 'FlowPay'
  }, [title])
}
