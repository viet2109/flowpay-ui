import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/ui/panel'
import { DeliveriesView } from '../components/DeliveriesView'
import { WebhooksTabs } from '../components/WebhooksTabs'

export function DeliveriesPage() {
  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Every delivery attempt FlowPay made to your endpoints, with full retry history."
      >
        <WebhooksTabs />
      </PageHeader>
      <Panel className="p-4">
        <DeliveriesView />
      </Panel>
    </>
  )
}
