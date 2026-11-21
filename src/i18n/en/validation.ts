/** Form validation messages. Schemas reference them with vmsg('key', params). */
export const validation = {
  required: 'Required.',
  tooLong: 'Use at most {{max}} characters.',
  emailRequired: 'Email is required.',
  email: 'Enter a valid email.',
  passwordRequired: 'Password is required.',
  passwordTooShort: 'Use at least {{min}} characters.',
  businessNameRequired: 'Your business name is required.',
  emailTaken: 'An account with this email already exists.',
  currency: 'Use a 3-letter currency code.',
  amountRequired: 'Enter an amount.',
  amountInvalid: 'Not a valid {{currency}} amount. Write it like {{example}}.',
  amountPositive: 'Amount must be greater than zero.',
  amountAboveRefundable: 'At most {{amount}} {{currency}} can be refunded.',
  urlRequired: 'Enter the URL that will receive events.',
  urlScheme: 'Use an https:// URL.',
  urlFragment: 'Remove the #fragment.',
  urlCredentials: 'Credentials in the URL are not allowed.',
  urlRejected:
    'FlowPay will not send to this address. Use a public URL; private, local and metadata addresses are rejected.',
  urlInvalid: 'This is not a valid URL.',
  eventsRequired: 'Choose at least one event.',
}
