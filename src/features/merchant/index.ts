export { SettingsPage } from './pages/SettingsPage'
export { useMerchant } from './queries'
export type { Merchant } from './api'
/** Dev-only /dev/ui section. `null` in production builds, so none of it ships. */
export const merchantGallery = import.meta.env.DEV ? () => import('./components/MerchantGallery') : null
