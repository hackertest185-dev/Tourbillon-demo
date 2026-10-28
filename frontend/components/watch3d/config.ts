export type WatchConfig = {
  caseSize: number;
  caseShape: 'round' | 'cushion';
  caseColor: string;
  dialColor: string;
  dialType: 'plain' | 'sunburst' | 'diver';
  markers: 'baton' | 'lume';
  strapType: 'steel' | 'leather' | 'silicone';
  strapColor: string;
  bezelColor?: string;
  datePosition: 0 | 3 | 6;
  dayDate?: boolean;
  gmt?: boolean;
  crownHour: number;
  domed?: boolean;
};
export type WatchVisualSource = { id: number; name: string; slug?: string; specs?: string | null; description?: string | null };

const base: WatchConfig = { caseSize: 40, caseShape: 'round', caseColor: '#c4cbd1', dialColor: '#142a43', dialType: 'sunburst', markers: 'baton', strapType: 'steel', strapColor: '#bbc2c8', datePosition: 3, crownHour: 3 };
export const WATCH_CONFIGS: Record<string, WatchConfig> = {
  srpe93: { ...base, caseSize: 45, caseShape: 'cushion', dialColor: '#121514', dialType: 'diver', markers: 'lume', strapType: 'silicone', strapColor: '#151817', bezelColor: '#111615', dayDate: true, crownHour: 4 },
  sbgm221: { ...base, caseSize: 39, dialColor: '#e6d7b4', dialType: 'plain', strapType: 'leather', strapColor: '#49241b', gmt: true },
  seastar1000: { ...base, caseSize: 43, dialColor: '#075475', dialType: 'diver', markers: 'lume', bezelColor: '#075477', datePosition: 6 },
  srpb41: { ...base, caseSize: 40.5, dialColor: '#153c6a', domed: true },
};
function color(value: string, fallback: string) {
  const colors: Record<string, string> = { blue: '#123d69', black: '#15191d', white: '#ece9de', silver: '#c1c8c9', green: '#154b3e', brown: '#503022', cream: '#e6d7b4', ivory: '#e6d7b4', gold: '#b99553', pink: '#b77e85', red: '#701d2a', orange: '#c56521', grey: '#646a70', gray: '#646a70', yellow: '#c4a135', purple: '#55395d' };
  return Object.entries(colors).find(([name]) => value.toLowerCase().includes(name))?.[1] ?? fallback;
}
export function configForWatch(watch: WatchVisualSource): WatchConfig {
  const text = `${watch.slug ?? ''} ${watch.name}`.toLowerCase();
  const normalized = text.replace(/[^a-z0-9]/g, '');
  const preset = Object.entries(WATCH_CONFIGS).find(([key]) => normalized.includes(key));
  if (preset) return preset[1];
  let specs: Record<string, Record<string, unknown>> = {};
  try { specs = JSON.parse(watch.specs || '{}') ?? {}; } catch { /* Legacy entries may have no structured specs. */ }
  const dial = String(specs.dial?.color ?? '');
  const strap = String(specs.strap?.material ?? '').toLowerCase();
  const material = String(specs.case?.material ?? '').toLowerCase();
  const size = Number.parseFloat(String(specs.case?.diameter ?? '40'));
  const diver = /diver|submariner|seamaster|pelagos|aquaracer|fifty fathoms/.test(text);
  const functions = String(specs.movement?.functions ?? '').toLowerCase();
  return {
    ...base,
    caseSize: Number.isFinite(size) ? Math.min(48, Math.max(32, size)) : 40,
    caseColor: material.includes('gold') ? (material.includes('rose') ? '#bb8b6e' : '#c3a15b') : base.caseColor,
    dialColor: color(dial, diver ? '#15191d' : base.dialColor),
    dialType: diver ? 'diver' : /sun|ray|guilloch/.test(String(specs.dial?.finish ?? '').toLowerCase()) ? 'sunburst' : 'plain',
    markers: diver || /lumin|lume/.test(String(specs.dial?.indices ?? '').toLowerCase()) ? 'lume' : 'baton',
    strapType: /rubber|silicon|textile|nylon/.test(strap) ? 'silicone' : /leather|alligator|croc|calf/.test(strap) ? 'leather' : 'steel',
    strapColor: color(String(specs.strap?.color ?? ''), /leather|alligator|croc|calf/.test(strap) ? '#472d22' : '#171b1e'),
    bezelColor: diver ? color(dial, '#15191d') : undefined,
    datePosition: functions && !/date|calendar/.test(functions) ? 0 : 3,
    gmt: /gmt|dual time/.test(text + functions),
  };
}
