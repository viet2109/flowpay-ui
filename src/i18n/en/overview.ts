/** Overview feature. In attention rows the count is rendered separately, before the phrase. */
export const overview = {
  title: 'Overview',
  description: 'What needs your attention at {{name}}.',
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
