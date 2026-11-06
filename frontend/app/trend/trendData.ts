// Hardcoded editorial data for the Trend page.
import { videoUrl } from '@/lib/cloudinary';

export interface StaffPick {
  slug: string;
  video?: string;
}

// Use featured watches that exist in the currently deployed catalogue.
export const STAFF_PICKS: StaffPick[] = [
  { slug: 'grand-seiko-snowflake-sbga211-sbga211', video: videoUrl('JLC') },
  { slug: 'grand-seiko-elegance-gmt-sbgm221-sbgm221', video: videoUrl('AP') },
  { slug: 'grand-seiko-shunbun-sbga413-sbga413', video: videoUrl('VC') },
];
