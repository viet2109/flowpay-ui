import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/ui/panel'
import { DeliveriesView } from '../components/DeliveriesView'
import { WebhooksTabs } from '../components/WebhooksTabs'

export function DeliveriesPage() {
  const { t } = useTranslation('webhooks')
  return (
    <>
      <PageHeader title={t('title')} description={t('deliveriesDescription')}>
        <WebhooksTabs />
      </PageHeader>
      <Panel className="p-4">
        <DeliveriesView />
      </Panel>
    </>
  )
}
