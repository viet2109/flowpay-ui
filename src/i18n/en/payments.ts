/** Payments pages (docs/api-contract.md §11, §18). <code> marks protocol text. */
export const payments = {
  title: 'Payments',
  description: 'Every payment of this merchant, from your backend or this dashboard, newest first.',
  newPayment: 'New test payment',
  filters: {
    status: 'Filter by status',
    all: 'All',
    orderId: 'Order ID',
    orderIdPlaceholder: 'Exact order ID',
    from: 'Created from',
    to: 'Created to',
    rangeSeparator: 'to',
    clear: 'Clear filters',
    rangeInverted: 'The start date is after the end date. Dates are not applied until that is fixed.',
  },
  columns: {
    amount: 'Amount',
    status: 'Status',
    order: 'Order',
    description: 'Description',
    id: 'Payment ID',
    created: 'Created',
  },
  empty: {
    title: 'No payments yet',
    body: 'Payments appear here when your backend calls <code>POST /payment-intents</code>, or when you create one from the dashboard.',
    action: 'Create a test payment',
  },
  filtered: {
    title: 'No payments match these filters',
    body: 'Order ID matches exactly. Dates use your local time zone.',
  },
  pastEnd: {
    title: 'This page is past the last payment',
    body: 'The list is shorter than the link expected.',
    action: 'Go to the first page',
  },
}
