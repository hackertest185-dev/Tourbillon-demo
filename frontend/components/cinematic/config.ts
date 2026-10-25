export const CINEMA = {
  colors: { black: '#0A0907', charcoal: '#14110E', gold: '#B08D57', cream: '#EDE4D3', burgundy: '#7A1F2B' },
  scrollScreens: 7, scrub: 1.25, cameraDamping: 5, parallax: 0.055,
  desktopDpr: 1.5, mobileDpr: 1.25, bloom: 0.16, grain: 0.012, vignette: 0.5,
  desktopParticles: 90, mobileParticles: 24, gearSpeed: 0.12,
  // One-line asset swaps. Null keeps the self-contained procedural edition.
  watchModel: null as string | null,
  environmentMap: null as string | null,
  ambientSound: null as string | null,
};
export type Vec3 = [number, number, number];
export type Pose = { camera: Vec3; target: Vec3; position: Vec3; rotation: Vec3; scale: number; explosion: number };
export type CinemaMotion = { progress: number; pointer: [number, number]; active: boolean };
export const CAMERA_PATH: Pose[] = [
  { camera: [0, 0.2, 9], target: [0, 0, 0], position: [1.05, -0.4, 0], rotation: [-0.12, -0.3, -0.15], scale: 0.95, explosion: 0 },
  { camera: [4.4, 2.1, 8.2], target: [0.1, 0, 0.6], position: [1, -0.2, 0], rotation: [0.15, -0.35, -0.4], scale: 0.95, explosion: 1 },
  { camera: [0.8, -0.3, 3.3], target: [0.25, -0.42, 0.8], position: [0.65, 0, 0], rotation: [0.04, -0.17, 0.12], scale: 1, explosion: 0.75 },
  { camera: [-1.2, 0.5, 8.6], target: [0, 0, 0], position: [1.15, 0, 0], rotation: [0.15, 0.45, -0.18], scale: 1.08, explosion: 0 },
  { camera: [0, 0, 9.8], target: [0, 0, 0], position: [0, -0.2, -3.5], rotation: [-0.12, -0.2, -0.12], scale: 0.72, explosion: 0 },
  { camera: [0, 0.4, 10], target: [0, 0, 0], position: [0, -1.8, -3], rotation: [0.25, -0.4, -0.7], scale: 0.82, explosion: 0 },
  { camera: [0, 1.1, 10.5], target: [0, -0.2, 0], position: [0, -1.15, 0], rotation: [-0.48, 0.22, 0.45], scale: 0.85, explosion: 0 },
];
export const CHAPTERS = [
  { id: 'overture', numeral: '00', label: 'فن الوقت', title: ['شوف الوقت', 'بعين مختلفة.'], description: 'ورا وش الساعة عالم كامل من التفاصيل. تعالى نكتشفه سوا.', detail: 'انزل براحة وركز في التفاصيل.' },
  { id: 'movement', numeral: 'I', label: 'حركة الساعة', title: ['كل حركة جوا الساعة', 'وراها حكاية.'], description: 'تروس ويايات وقطع صغيرة شغالة مع بعض بدقة رهيبة. مفيش تفصيلة ملهاش لازمة، وكل حاجة بتتحرك في مكانها الصح.', detail: 'تعالى شوف الساعة الميكانيكية من جوه' },
  { id: 'complication', numeral: 'II', label: 'عبقرية الميكانيكا', title: ['اختراع صغير', 'بيتحدى الجاذبية.'], description: 'التوربيون بيلف حوالين نفسه عشان يقلل تأثير الجاذبية على دقة الساعة. عالم صغير جوا الساعة، كله حركة وتوازن.', detail: 'حركة منتظمة بتنظم دقات الساعة' },
  { id: 'case', numeral: 'III', label: 'جسم الساعة', title: ['الدقة باينة', 'في كل تفصيلة.'], description: 'لمعة زجاج الياقوت، وفخامة المعدن، وتفاصيل دقيقة كلها متجمعة في ساعة على إيدك.', detail: 'زجاج ياقوت · معدن متشكل بدقة · ميكانيكا مليانة حركة' },
  { id: 'maisons', numeral: 'IV', label: 'بيوت الساعات', title: ['براندات مختلفة.', 'وشغف واحد بالساعات.'], description: 'كل براند ليه شخصيته وشكله المميز. اكتشف البراندات اللي ليها بصمتها في عالم الساعات الفخمة.', detail: 'اختار براند وشوف حكايته' },
  { id: 'smart-search', numeral: 'V', label: 'لاقي ساعتك', title: ['في ساعات أول ما تشوفها،', 'تحس إنها شبهك.'], description: 'ممكن يعجبك شكل ساعة، أو خامتها، أو حتى تفاصيلها الصغيرة. قولنا إيه اللي بتحبه في الساعات.', detail: 'كام كلمة منك توصلك لساعتك الجاية' },
  { id: 'private-access', numeral: 'VI', label: 'تجربة معمولة مخصوص ليك', title: ['ابدأ مجموعتك', 'من الساعات.'], description: 'لو بتحب الساعات المميزة، تقدر تحجز معاد خاص وتتفرج عليها براحتك.', detail: 'اسكندرية · بميعاد مسبق' },
];
export const MAISONS = [
  ['Patek Philippe', 'patek-philippe'], ['Vacheron Constantin', 'vacheron-constantin'],
  ['Audemars Piguet', 'audemars-piguet'], ['A. Lange & Söhne', 'a-lange-sohne'],
  ['F.P. Journe', 'fp-journe'], ['Breguet', 'breguet'], ['Rolex', 'rolex'],
  ['Omega', 'omega'], ['Jaeger-LeCoultre', 'jaeger-lecoultre'],
  ['Grand Seiko', 'grand-seiko'], ['Glashütte Original', 'glashutte-original'],
  ['Greubel Forsey', 'greubel-forsey'], ['Frédérique Constant', 'frederique-constant'],
] as const;
export const SEARCH_EXAMPLES = ['Tissot under 1000', 'Grand Seiko Spring Drive', 'Blue dial automatic', 'Seiko GMT'];
export function smoothstep(a: number, b: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
export function samplePose(progress: number) {
  const p = Math.max(0, Math.min(CAMERA_PATH.length - 1, progress));
  const index = Math.min(Math.floor(p), CAMERA_PATH.length - 2);
  return { from: CAMERA_PATH[index], to: CAMERA_PATH[index + 1], t: smoothstep(0, 1, p - index) };
}
