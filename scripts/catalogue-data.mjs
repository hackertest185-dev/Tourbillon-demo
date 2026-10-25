// A small, sourced development catalogue. Prices are official US retail prices in USD.
// Source pages were checked on 2026-10-25. Never generate substitute product photographs.
export const checkedAt = '2026-10-25';
export const brands = [
  { name: 'Tissot', slug: 'tissot', summary: 'Swiss mechanical and quartz watches, from integrated bracelets to diving instruments.', description: 'Tissot combines Swiss watchmaking with everyday practicality. Explore the angular PRX, the versatile Gentleman and the water-ready Seastar.' },
  { name: 'Grand Seiko', slug: 'grand-seiko', summary: 'Japanese precision, textured dials and carefully finished cases.', description: 'Grand Seiko brings together mechanical and Spring Drive watchmaking. Its Heritage and Elegance collections pair distinctive dial textures with restrained proportions.' },
  { name: 'Seiko', slug: 'seiko', summary: 'Accessible Japanese watchmaking for everyday wear, travel and diving.', description: 'Discover Seiko through the dress-focused Presage, robust Prospex divers and versatile Seiko 5 Sports collection.' },
];
export const collections = [
  ['tissot', 'PRX', 'prx', ['sport'], 'An integrated bracelet and an angular case define this everyday collection.'],
  ['tissot', 'Gentleman', 'gentleman', ['dress'], 'A versatile round watch with a restrained dial and automatic movement.'],
  ['tissot', 'Seastar 1000', 'seastar-1000', ['sport', 'diver'], 'Water-ready watches with rotating bezels and strong water resistance.'],
  ['grand-seiko', 'Heritage', 'heritage', ['dress', 'sport'], 'Textured dials and carefully finished cases inspired by Japanese landscapes.'],
  ['grand-seiko', 'Elegance', 'elegance', ['dress'], 'Compact proportions, leather straps and classical dial layouts.'],
  ['seiko', 'Presage', 'presage', ['dress'], 'Mechanical dress watches with distinctive dial finishes.'],
  ['seiko', 'Prospex', 'prospex', ['sport', 'diver'], 'Practical tool watches designed for demanding activities.'],
  ['seiko', '5 Sports', '5-sports', ['sport'], 'Everyday automatic watches with clear displays and durable construction.'],
].map(([brand, name, slug, styles, description]) => ({ brand, name, slug: `${brand}-${slug}`, styles, description }));

function specs(color, diameter, thickness, water, type, caliber, reserve, strap, functions = ['Hours', 'Minutes', 'Seconds', 'Date'], material = 'Stainless steel', crystal = 'Sapphire') {
  return {
    productionStatus: 'Current production',
    dial: { color },
    case: { material, diameter: `${diameter} mm`, thickness: `${thickness} mm`, waterResistance: water, crystal },
    movement: { type, ...(caliber && { caliber }), ...(reserve && { powerReserve: `${reserve} hours` }), functions },
    strap: { material: strap },
  };
}
const tissot = ref => `https://www.tissotwatches.com/en-us/${ref}.html`;
const gs = ref => `https://www.grand-seiko.com/us-en/collections/${ref}G`;
const seiko = ref => `https://seikousa.com/products/${ref.toLowerCase()}`;
export const watches = [
  { reference: 'T1374071104100', brand: 'tissot', collection: 'tissot-prx', name: 'PRX Powermatic 80 Blue', price: 850, sourceUrl: tissot('T1374071104100'), description: 'A blue textured dial and integrated steel bracelet, with an automatic movement offering up to 80 hours of power reserve.', specs: specs('Blue', 40, 10.93, '100 m / 10 bar', 'Automatic', null, 80, 'Stainless steel bracelet') },
  { reference: 'T1374101104100', brand: 'tissot', collection: 'tissot-prx', name: 'PRX Quartz Blue', price: 450, sourceUrl: tissot('T1374101104100'), description: 'The slim quartz PRX combines a blue dial, a date display and an integrated stainless steel bracelet.', specs: specs('Blue', 40, 10.4, '100 m / 10 bar', 'Quartz', null, null, 'Stainless steel bracelet') },
  { reference: 'T1274071104100', brand: 'tissot', collection: 'tissot-gentleman', name: 'Gentleman Powermatic 80 Silicium Blue', price: 950, sourceUrl: tissot('T1274071104100'), description: 'A versatile blue-dial automatic with a silicon balance spring, a steel bracelet and an 80-hour power reserve.', specs: specs('Blue', 40, 11.5, '100 m / 10 bar', 'Automatic', null, 80, 'Stainless steel bracelet') },
  { reference: 'T1204071104103', brand: 'tissot', collection: 'tissot-seastar-1000', name: 'Seastar 1000 Powermatic 80 Blue', price: 925, sourceUrl: tissot('T1204071104103'), description: 'A blue-dial diver with a ceramic rotating bezel, screw-down crown and water resistance rated to 300 meters.', specs: specs('Blue', 43, 12.7, '300 m / 30 bar', 'Automatic', null, 80, 'Stainless steel bracelet') },
  { reference: 'SBGA211', brand: 'grand-seiko', collection: 'grand-seiko-heritage', name: 'Snowflake SBGA211', price: 6900, sourceUrl: gs('SBGA211'), description: 'The white Snowflake dial meets a lightweight titanium case and bracelet, powered by the smooth sweep of Spring Drive.', specs: specs('White', 41, 12.5, '100 m / 10 bar', 'Spring Drive', '9R65', 72, 'Titanium bracelet', ['Hours', 'Minutes', 'Seconds', 'Date', 'Power reserve indicator'], 'High-Intensity Titanium') },
  { reference: 'SBGA413', brand: 'grand-seiko', collection: 'grand-seiko-heritage', name: 'Shunbun SBGA413', price: 7200, sourceUrl: gs('SBGA413'), description: 'A soft pink dial inspired by floating cherry blossoms, in a titanium case with a 72-hour Spring Drive movement.', specs: specs('Pink', 40, 12.8, '100 m / 10 bar', 'Spring Drive', '9R65', 72, 'Titanium bracelet', ['Hours', 'Minutes', 'Seconds', 'Date', 'Power reserve indicator'], 'High-Intensity Titanium') },
  { reference: 'SBGM221', brand: 'grand-seiko', collection: 'grand-seiko-elegance', name: 'Elegance GMT SBGM221', price: 5400, sourceUrl: gs('SBGM221'), description: 'An ivory dial with a contrasting blue GMT hand and a crocodile leather strap, powered by the automatic 9S66 caliber.', specs: specs('Ivory', 39.5, 13.7, 'Splash resistant', 'Automatic', '9S66', 72, 'Crocodile leather', ['Hours', 'Minutes', 'Seconds', 'Date', 'GMT']) },
  { reference: 'SBGW301', brand: 'grand-seiko', collection: 'grand-seiko-elegance', name: 'Elegance Manual SBGW301', price: 5000, sourceUrl: gs('SBGW301'), description: 'A compact hand-wound dress watch with an off-white dial, a crocodile leather strap and a 72-hour power reserve.', specs: specs('Ivory', 37.3, 11.7, 'Splash resistant', 'Manual', '9S64', 72, 'Crocodile leather', ['Hours', 'Minutes', 'Seconds']) },
  { reference: 'SRPB41', brand: 'seiko', collection: 'seiko-presage', name: 'Presage Cocktail Time SRPB41', price: 475, sourceUrl: seiko('SRPB41'), description: 'A blue pressed-pattern dial under a box-shaped Hardlex crystal, paired with an automatic movement and a steel bracelet.', specs: specs('Blue', 40.5, 11.8, '50 m / 5 bar', 'Automatic', '4R35', 41, 'Stainless steel bracelet', undefined, undefined, 'Box-shaped Hardlex') },
  { reference: 'SRPE93', brand: 'seiko', collection: 'seiko-prospex', name: 'Prospex Turtle Diver SRPE93', price: 525, sourceUrl: seiko('SRPE93'), description: 'A black-dial automatic diver with a rotating timing bezel, silicone strap and a 200-meter water-resistance rating.', specs: specs('Black', 45, 13.42, '200 m / 20 bar', 'Automatic', '4R36', 41, 'Silicone', ['Hours', 'Minutes', 'Seconds', 'Date', 'Day'], undefined, 'Hardlex') },
  { reference: 'SRPD55', brand: 'seiko', collection: 'seiko-5-sports', name: '5 Sports Automatic SRPD55', price: 350, sourceUrl: seiko('SRPD55'), description: 'A black dial and bezel, luminous markers and a day-date display make this steel automatic a practical everyday choice.', specs: specs('Black', 42.5, 13.4, '100 m / 10 bar', 'Automatic', '4R36', 41, 'Stainless steel bracelet', ['Hours', 'Minutes', 'Seconds', 'Date', 'Day'], undefined, 'Hardlex') },
  { reference: 'SSK003', brand: 'seiko', collection: 'seiko-5-sports', name: '5 Sports GMT SSK003', price: 495, sourceUrl: seiko('SSK003'), description: 'A travel-ready automatic with a blue dial, a blue-and-black GMT bezel, a magnified date and a five-row steel bracelet.', specs: specs('Blue', 42.5, 13.6, '100 m / 10 bar', 'Automatic', '4R34', 41, 'Stainless steel bracelet', ['Hours', 'Minutes', 'Seconds', 'Date', 'GMT'], undefined, 'Hardlex') },
].map(w => ({ ...w, slug: `${w.brand}-${w.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${w.reference.toLowerCase()}`.replace(/-+/g, '-'), currency: 'USD', checkedAt, imageKey: `catalogue/${w.reference.toLowerCase()}.png` }));
