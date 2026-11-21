/** API keys page (docs/api-contract.md §9). <code> marks protocol text. */
export const apiKeys = {
  title: 'API keys',
  description: 'Secret keys for server-to-server calls. Never ship them in a browser or mobile app.',
  create: 'Create key',
  usage:
    'Requests authenticate with <code>Authorization: Bearer fp_test_…</code>. Revoking a key is permanent and takes effect on the next request.',
  empty: {
    title: 'No API keys yet',
    body: 'Create a key to call the Payment and Refund APIs from your backend.',
    action: 'Create your first key',
  },
  columns: {
    name: 'Name',
    key: 'Key',
    status: 'Status',
    id: 'ID',
    created: 'Created',
  },
  revoke: 'Revoke',
  revokeTitle: 'Revoke “{{name}}”?',
  revokeBody:
    'Any backend still using this key gets 401 API_KEY_REVOKED on its next request. A revoked key cannot be restored.',
  revokeConfirm: 'Revoke key',
  revoked: 'Revoked “{{name}}”',
  form: {
    title: 'Create API key',
    description: 'Keys authenticate your backend against the Payment and Refund APIs.',
    name: 'Name',
    nameHint: 'Describe where it will be used, e.g. “Checkout service – staging”.',
    cancel: 'Cancel',
    submit: 'Create key',
    createdTitle: 'Copy your new key',
    createdDescription: '“{{name}}” is active. Use it as a Bearer token from your backend.',
    secretLabel: 'Secret key',
    stored: 'I’ve stored it',
  },
}
