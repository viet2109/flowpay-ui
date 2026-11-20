export const webhooks = {
  title: 'Webhooks',
  description:
    'Get notified when payments and refunds change state. Each request is signed with HMAC-SHA256.',
  addEndpoint: 'Add endpoint',
  deliveriesDescription: 'Every delivery attempt FlowPay made to your endpoints, with full retry history.',
  tabs: {
    label: 'Webhooks',
    endpoints: 'Endpoints',
    deliveries: 'Deliveries',
  },
  empty: {
    title: 'No endpoints yet',
    body: 'Point FlowPay at a URL on your server to receive payment and refund events.',
    action: 'Add your first endpoint',
  },
  endpoint: {
    events_one: '{{count}} event',
    events_other: '{{count}} events',
    updated: 'updated',
    disabled: 'Receives no events',
  },
  health: {
    lastDelivery: 'Last delivery',
    noDeliveries: 'No deliveries yet',
    dead_one: '{{count}} dead delivery to retry',
    dead_other: '{{count}} dead deliveries to retry',
    retrying_one: '{{count}} retrying',
    retrying_other: '{{count}} retrying',
    unavailable: 'Delivery health unavailable',
  },
}
