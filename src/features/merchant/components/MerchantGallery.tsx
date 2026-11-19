import { GallerySection, GalleryStatusRow } from '@/components/dev-gallery'
import { merchantStatus } from '../status'

/** Dev-only section of /dev/ui. Not used by product screens. */
export function MerchantGallery() {
  return (
    <GallerySection title="Merchant statuses">
      <GalleryStatusRow name="Merchant" map={merchantStatus} />
    </GallerySection>
  )
}
