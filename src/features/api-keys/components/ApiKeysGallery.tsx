import { GallerySection, GalleryStatusRow } from '@/components/dev-gallery'
import { keyStatus } from '../status'

/** Dev-only section of /dev/ui. Not used by product screens. */
export function ApiKeysGallery() {
  return (
    <GallerySection title="API key statuses">
      <GalleryStatusRow name="ApiKey" map={keyStatus} />
    </GallerySection>
  )
}
