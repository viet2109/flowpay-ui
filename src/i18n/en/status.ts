/** Status labels, one group per backend state machine. StatusMap entries point here. */
export const status = {
  payment: {
    CREATED: 'Created',
    PROCESSING: 'Processing',
    SUCCEEDED: 'Succeeded',
    FAILED: 'Failed',
    PARTIALLY_REFUNDED: 'Partially refunded',
    REFUNDED: 'Refunded',
  },
  transaction: {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    SUCCEEDED: 'Succeeded',
    FAILED: 'Declined',
    UNKNOWN: 'Outcome unknown',
  },
  refund: {
    CREATED: 'Created',
    PROCESSING: 'Processing',
    SUCCEEDED: 'Refunded',
    FAILED: 'Failed',
  },
  delivery: {
    PENDING: 'Pending',
    DELIVERING: 'Delivering',
    DELIVERED: 'Delivered',
    RETRYING: 'Retrying',
    DEAD: 'Dead',
  },
  endpoint: {
    ACTIVE: 'Active',
    DISABLED: 'Disabled',
  },
  apiKey: {
    ACTIVE: 'Active',
    REVOKED: 'Revoked',
  },
  merchant: {
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    CLOSED: 'Closed',
  },
}
