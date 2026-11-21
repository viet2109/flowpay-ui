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
  form: {
    addTitle: 'Add webhook endpoint',
    editTitle: 'Edit endpoint',
    description:
      'FlowPay POSTs signed JSON to this URL. Delivery is at-least-once: deduplicate by FlowPay-Event-Id.',
    url: 'Endpoint URL',
    urlHint: 'HTTPS required in production. Private, local and metadata addresses are rejected.',
    events: 'Events',
    selected: '{{count}} of {{total}} selected',
    add: 'Add endpoint',
    save: 'Save changes',
    updated: 'Endpoint updated',
    createdTitle: 'Endpoint created',
    createdDescription: 'Use this secret to verify the FlowPay-Signature header on every request.',
    secretLabel: 'Signing secret',
    stored: 'I’ve stored it',
  },
  picker: {
    selectAll: 'Select all',
    clearAll: 'Clear all',
    none: 'No events selected',
    resource: { payment: 'Payment', refund: 'Refund' },
    outcome: { processing: 'Processing', succeeded: 'Succeeded', failed: 'Failed' },
  },
  /** Keyed by event name: t(`event.${type}`) reads e.g. event.payment.succeeded. */
  event: {
    payment: {
      processing: 'Sent to the provider; outcome not known yet.',
      succeeded: 'Provider confirmed the charge.',
      failed: 'Provider declined the charge.',
    },
    refund: {
      processing: 'Refund outcome not known yet.',
      succeeded: 'Money returned to the customer.',
      failed: 'Provider rejected the refund.',
    },
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
