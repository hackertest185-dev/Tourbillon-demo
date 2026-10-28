'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchBrands, TasteProfile } from '@/lib/api';

// Build interface copy from structured preferences instead of displaying an
// English AI paragraph or translating product data with DOM replacements.
export default function TasteProfileSummary({ profile }: { profile: TasteProfile }) {
  const brandIds = profile.preferredBrandIds ?? [];
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands,
    enabled: brandIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
  const brandNames = brands.filter(brand => brandIds.includes(brand.id)).map(brand => brand.name).slice(0, 3);
  const materials = profile.preferredMaterials?.slice(0, 3) ?? [];
  const colors = profile.preferredDialColors?.slice(0, 3) ?? [];
  const hasBudget = profile.priceMin != null || profile.priceMax != null;
  const size = profile.preferredCaseSize;
  const hasPreferences = brandNames.length > 0 || materials.length > 0 || colors.length > 0 || hasBudget || size;

  if (!hasPreferences) {
    return <>{profile.tasteText || profile.hasBehaviorAnalysis
      ? 'اختياراتك محفوظة. كمّل تتفرج على الساعات عشان نرشحلك حاجات تناسبك أكتر.'
      : 'كمّل تتفرج على الساعات عشان نعرف ذوقك أكتر.'}</>;
  }

  return <>
    {brandNames.length > 0 && <>بتميل لبراندات زي <bdi dir="ltr" translate="no">{brandNames.join(', ')}</bdi>. </>}
    {materials.length > 0 && <>الخامات اللي بتحبها: <bdi dir="ltr" translate="no">{materials.join(', ')}</bdi>. </>}
    {colors.length > 0 && <>ألوان وش الساعة اللي بتشدك: <bdi dir="ltr" translate="no">{colors.join(', ')}</bdi>. </>}
    {hasBudget && <>ميزانيتك {profile.priceMin != null ? <>من <bdi dir="ltr" translate="no">${profile.priceMin.toLocaleString('en-US')}</bdi> </> : null}
      {profile.priceMax != null ? <>لحد <bdi dir="ltr" translate="no">${profile.priceMax.toLocaleString('en-US')}</bdi></> : 'وأكتر'}. </>}
    {size && <>وبتفضّل مقاس {({ small: 'صغير', medium: 'متوسط', large: 'كبير' } as const)[size]} على إيدك.</>}
  </>;
}
