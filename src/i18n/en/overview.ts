/** Overview feature. In attention rows the count is rendered separately, before the phrase. */
export const overview = {
  title: 'Overview',
  description: 'What needs your attention, and how payments and webhooks are doing.',
  setup: {
    title: 'Get set up',
    description: 'See the full payment, ledger and webhook flow against the simulator.',
    progress: '{{done}} of {{total}} done',
    apiKey: 'Create an API key for your backend',
    endpoint: 'Add a webhook endpoint',
    payment: 'Create your first test payment',
  },
  attention: {
    title: 'Needs attention',
    allClear: 'All clear',
    processing_one: 'payment awaiting the provider’s outcome',
    processing_other: 'payments awaiting the provider’s outcome',
    deadDeliveries_one: 'dead webhook delivery you can retry',
    deadDeliveries_other: 'dead webhook deliveries you can retry',
    retrying_one: 'delivery retrying with backoff',
    retrying_other: 'deliveries retrying with backoff',
    someFailed: 'Some counts could not be loaded, so this list may be incomplete.',
    retry: 'Try again',
  },
  deliveries: {
    title: 'Webhook deliveries',
    description: 'All time, by current status.',
  },
  payments: {
    title: 'Payments by status',
    description: 'All payments of this merchant.',
  },
  recent: {
    title: 'Recent payments',
    viewAll: 'View all',
    empty: 'No payments yet.',
  },
  empty: 'Nothing here yet.',
}
