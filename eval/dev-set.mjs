// The dev set: tune against it as often as you like. Both scopes, both subsystems.
//
// Three groups, run together as --set=dev or one at a time with --group:
//   realistic    40 authored shopping requests, 20 spec and 20 semantic, each stating its hard
//                limits apart from its preferences, so violation rate is measurable on every brief;
//   legacy       HANDWRITTEN, the older 89, plus buildGenerated's facet queries at run time. The
//                published development numbers were measured on this group;
//   former-test  the 80 briefs that were the held-out set until they had been read.
//
// The held-out counterpart is test-set.mjs. Labels here are written from the brief, never from
// what a system returned for it - grading a run by ticking whatever came back is self-assessment.

export const REALISTIC = [
  { id: 'r01', category: 'brand_alias', query: 'jlc automatic watches under 20k',
    truth: { brand: 'Jaeger-LeCoultre', movementAny: ['automatic'], priceMax: 20000 } },
  { id: 'r02', category: 'collection', query: 'do you have any speedmasters with a black dial?',
    truth: { collection: 'Speedmaster', dialAny: ['black'] } },
  { id: 'r03', category: 'compound', query: 'blue dial chrono, max 30k. automatic please',
    truth: { dialAny: ['blue'], functionsAny: ['chronograph'], priceMax: 30000, movementAny: ['automatic'] } },
  { id: 'r04', category: 'compound', query: 'looking for a steel automatic with a date. 40mm is my limit',
    truth: { materialAny: ['steel'], movementAny: ['automatic'], functionsAny: ['date'], diameterMax: 40 } },
  { id: 'r05', category: 'exclusion', query: 'nothing from rolex please, budget is 15k max and i want an automatic',
    truth: { excludeBrand: ['Rolex'], priceMax: 15000, movementAny: ['automatic'] } },
  { id: 'r06', category: 'compound', query: 'green face, sports watch, metal bracelet. all three please',
    truth: { dialAny: ['green'], styleAny: ['sport', 'diver'], strapAny: ['bracelet', 'oyster'] } },
  { id: 'r07', category: 'size', query: '36 to 39mm watches. not wrist size, i mean the case',
    truth: { diameterMin: 36, diameterMax: 39 } },
  { id: 'r08', category: 'movement', query: 'manual wind with at least 72 hours power reserve',
    truth: { movementAny: ['manual'], powerReserveMin: 72 } },
  { id: 'r09', category: 'movement', query: 'i need a full week of power reserve, at least 168 hours',
    truth: { powerReserveMin: 168 } },
  { id: 'r10', category: 'water_resistance', query: 'steel dive watch with 300m water resistance or better',
    truth: { materialAny: ['steel'], styleAny: ['diver'], waterResistanceMin: 300 } },
  { id: 'r11', category: 'exclusion', query: 'dress watches up to 40mm, no gold case even white gold',
    truth: { styleAny: ['dress'], diameterMax: 40, materialNone: ['gold'] } },
  { id: 'r12', category: 'compound', query: 'a moonphase on leather, under 40 thousand. dont mind the brand',
    truth: { functionsAny: ['moon'], strapAny: ['leather', 'alligator', 'calf', 'crocodile'], priceMax: 40000 } },
  { id: 'r13', category: 'brand_budget', query: 'omega watches between 5k and 12k, thats the whole budget',
    truth: { brand: 'Omega', priceMin: 5000, priceMax: 12000 } },
  { id: 'r14', category: 'compound', query: 'black dial on a leather strap. hand wound, not automatic',
    truth: { dialAny: ['black'], strapAny: ['leather', 'alligator', 'calf', 'crocodile'], movementAny: ['manual'] } },
  { id: 'r15', category: 'exclusion', query: 'steel sports watches without a chronograph, too many buttons for me',
    truth: { materialAny: ['steel'], styleAny: ['sport', 'diver'], functionsNone: ['chronograph'] } },
  { id: 'r16', category: 'complication', query: 'something that shows home time as well as local time, under 25k',
    truth: { functionsAny: ['gmt', 'dual time', 'second time', 'world time', 'worldtime', 'home time'], priceMax: 25000 } },
  { id: 'r17', category: 'compound', query: 'rose gold dress watch on leather, no bigger than 38mm',
    truth: { materialAny: ['rose gold', 'pink gold'], styleAny: ['dress'], diameterMax: 38,
      strapAny: ['leather', 'alligator', 'calf', 'crocodile'] } },
  { id: 'r18', category: 'dial', query: 'an automatic where i can see the gears through the front, not just the back',
    truth: { movementAny: ['automatic'], dialAny: ['openworked', 'skeleton', 'sapphire'] } },
  { id: 'r19', category: 'brand_alias', query: 'patek philipe in white gold',
    truth: { brand: 'Patek Philippe', materialAny: ['white gold'] } },
  { id: 'r20', category: 'exclusion', query: 'chronograph on rubber or a bracelet. no leather, 25k tops',
    truth: { functionsAny: ['chronograph'], strapAny: ['rubber', 'bracelet', 'oyster'], priceMax: 25000 } },

  { id: 'r21', category: 'persona',
    query: "i've only worn an apple watch and want my first proper watch. mostly office, jeans on weekends. 10k is the absolute limit. where would you start?",
    must: { priceMax: 10000 },
    replyChecks: ['explain the everyday trade-offs in plain language', 'do not assume the customer knows movement terminology'],
    rubric: [
      { grade: 3, when: { movementAny: ['automatic'], materialAny: ['steel', 'titan'], diameterMax: 41 }, why: 'a modest everyday mechanical watch within the stated first-purchase budget' },
      { grade: 2, when: { diameterMax: 42 }, why: 'a wearable starting point, with movement or material trade-offs to explain' },
      { grade: 1, when: {}, why: 'within budget but less clearly suited to one watch for work and weekends' },
    ] },
  { id: 'r22', category: 'occasion',
    query: "getting married in a navy suit, then i'd like to wear the watch to work. i hate chunky watches. can spend up to 20k but would rather not use all of it",
    must: { priceMax: 20000 },
    replyChecks: ['address both the wedding and later office use', 'treat 20k as a ceiling, not a spending target'],
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 39 }, why: 'a restrained dress watch supports both stated occasions and the preference against bulk' },
      { grade: 2, when: { styleAny: ['dress'], diameterMax: 41 }, why: 'fits the occasions but needs a discussion of how it wears' },
      { grade: 1, when: { diameterMax: 41 }, why: 'a wearable alternative with a less formal character' },
    ] },
  { id: 'r23', category: 'fit',
    query: "my wrist is 15.5cm and every watch in photos seems huge. i want something for everyday wear, not necessarily a ladies watch. max 12k. what should i try?",
    must: { priceMax: 12000 },
    replyChecks: ['do not turn 15.5cm wrist circumference into a case diameter', 'explain that diameter alone cannot guarantee fit; avoid gender assumptions'],
    rubric: [
      { grade: 3, when: { diameterMax: 36 }, why: 'a smaller case is a sensible starting point for a fitting, not a guarantee' },
      { grade: 2, when: { diameterMax: 39 }, why: 'may suit the wrist depending on shape and lug dimensions' },
      { grade: 1, when: { diameterMax: 41 }, why: 'a less promising size that needs a try-on caveat' },
    ] },
  { id: 'r24', category: 'lifestyle',
    query: "one watch for the office and holidays. i swim in the hotel pool and dont want to take it off every time. budget 15k, leather gets sweaty on me",
    must: { priceMax: 15000 },
    replyChecks: ['address water use and strap comfort', 'do not promise swimming suitability solely from a style label'],
    rubric: [
      { grade: 3, when: { waterResistanceMin: 100, strapAny: ['rubber', 'bracelet', 'oyster'], diameterMax: 42 }, why: 'water resistance and a washable strap fit the use described' },
      { grade: 2, when: { waterResistanceMin: 100 }, why: 'has the water-resistance margin but strap or size needs discussion' },
      { grade: 1, when: { waterResistanceMin: 50 }, why: 'only a compromise requiring explicit caution about the intended water use' },
    ] },
  { id: 'r25', category: 'lifestyle',
    query: "i'm in sydney but my team is in london. tired of checking my phone to work out their time. up to 30k, needs to be something i can wear daily too",
    must: { priceMax: 30000 },
    replyChecks: ['connect a second-time-zone feature to the actual use', 'do not invent traveller-GMT functionality or daylight-saving behaviour'],
    rubric: [
      { grade: 3, when: { functionsAny: ['gmt', 'dual time', 'second time', 'world time', 'worldtime', 'home time'] }, why: 'directly helps read the time in two places' },
      { grade: 2, when: { movementAny: ['automatic'], waterResistanceMin: 100 }, why: 'a practical daily watch but it does not solve the second-time-zone request' },
      { grade: 1, when: { movementAny: ['automatic'] }, why: 'a daily alternative only if its missing travel feature is acknowledged' },
    ] },
  { id: 'r26', category: 'persona',
    query: "buying a retirement gift for dad. he wears plain shirts and his old watch is small, hates anything that shouts expensive. 15k max. what would you suggest?",
    must: { priceMax: 15000 },
    replyChecks: ['use his stated taste instead of assuming retirement calls for gold', 'explain why the shortlist stays understated'],
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 39, materialNone: ['gold', 'platin'] }, why: 'small and restrained fits the recipient described by the buyer' },
      { grade: 2, when: { styleAny: ['dress'], diameterMax: 41 }, why: 'classic but size or precious metal may be a compromise' },
      { grade: 1, when: { diameterMax: 41 }, why: 'plausibly wearable but less aligned with the stated quiet style' },
    ] },
  { id: 'r27', category: 'collector',
    query: "already have a submariner and a speedmaster. looking for something different for dinners, not another sports watch. budget up to 40k",
    must: { priceMax: 40000, styleNone: ['sport', 'diver'] },
    replyChecks: ['recognise the named watches as already owned', 'explain what the new watch adds to the collection'],
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40, strapAny: ['leather', 'alligator', 'calf', 'crocodile'] }, why: 'a compact dress watch on leather fills a different role from the owned sports watches' },
      { grade: 2, when: { styleAny: ['dress'] }, why: 'adds a formal option with size or strap compromises' },
      { grade: 1, when: {}, why: 'avoids the excluded category but its place in the collection needs explaining' },
    ] },
  { id: 'r28', category: 'aesthetic',
    query: "i like the nautilus look but i dont want patek prices. no patek please, 20k is my ceiling. something with that relaxed bracelet-watch feel?",
    must: { excludeBrand: ['Patek Philippe'], priceMax: 20000 },
    replyChecks: ['treat Nautilus as an aesthetic reference, not a required collection', 'explain similarities and differences without claiming identical design'],
    rubric: [
      { grade: 3, when: { styleAny: ['sport'], materialAny: ['steel'], strapAny: ['bracelet', 'oyster'] }, why: 'a steel sports watch on a bracelet captures the broad feel requested' },
      { grade: 2, when: { strapAny: ['bracelet', 'oyster'] }, why: 'shares the bracelet format but may differ in overall character' },
      { grade: 1, when: { styleAny: ['sport'] }, why: 'a relaxed sports alternative missing the preferred bracelet' },
    ] },
  { id: 'r29', category: 'persona',
    query: "a gift for my partner, she prefers larger watches and borrows my 40mm one. no pink or diamonds vibe please. steel case, 10k max, everyday use",
    must: { materialAny: ['steel'], priceMax: 10000 },
    replyChecks: ['follow her stated size preference instead of assuming a small watch', 'verify decoration from available facts; do not claim diamond-free without evidence'],
    rubric: [
      { grade: 3, when: { diameterMin: 38, diameterMax: 41, dialAny: ['black', 'blue', 'white', 'silver'] }, why: 'close to the watch she already borrows, with a restrained dial colour' },
      { grade: 2, when: { diameterMin: 38, diameterMax: 42 }, why: 'follows the larger-case preference with a dial or size compromise' },
      { grade: 1, when: { diameterMin: 36, diameterMax: 43 }, why: 'a nearby fit worth trying, less directly grounded in her known preference' },
    ] },
  { id: 'r30', category: 'budget_vibe',
    query: "saved 8k for this and really can't go over. want something that feels special for my graduation but wont look out of place at my first office job",
    must: { priceMax: 8000 },
    replyChecks: ['honour the firm budget without suggesting a stretch', 'explain a practical choice for graduation and office use'],
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40 }, why: 'a modest dress watch fits the upcoming office role as well as the occasion' },
      { grade: 2, when: { diameterMax: 42 }, why: 'an everyday option that can still mark the milestone' },
      { grade: 1, when: {}, why: 'affordable but less clearly matched to the setting' },
    ] },
  { id: 'r31', category: 'lifestyle',
    query: "i rotate watches and sometimes leave one for a week. is an automatic going to be annoying? show me a couple that might suit, up to 15k",
    must: { priceMax: 15000 },
    replyChecks: ['explain stopping and resetting honestly', 'do not claim a 70-hour reserve lasts a week or exclude quartz without a reason'],
    rubric: [
      { grade: 3, whenAny: [{ movementAny: ['quartz'] }, { powerReserveMin: 168 }], why: 'quartz or a documented week-long reserve directly addresses time off the wrist' },
      { grade: 2, when: { powerReserveMin: 70 }, why: 'reduces resetting frequency but still will not cover a full week' },
      { grade: 1, when: {}, why: 'a possible choice only with an honest explanation of resetting or maintenance' },
    ] },
  { id: 'r32', category: 'aesthetic',
    query: "want something interesting when you look closely, but not a massive shiny thing everyone notices. office most days. max 30k, open to brands i haven't heard of",
    must: { priceMax: 30000 },
    replyChecks: ['point to an actual detail that makes each choice interesting', 'avoid equating expensive metal with discretion'],
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40, materialNone: ['gold', 'platin'] }, why: 'restrained size and metal are a reasonable proxy for quiet office wear' },
      { grade: 2, when: { diameterMax: 41, materialNone: ['gold', 'platin'] }, why: 'understated proportions with a less formal style' },
      { grade: 1, when: { diameterMax: 42 }, why: 'a plausible alternative whose visual restraint needs closer review' },
    ] },
  { id: 'r33', category: 'fit',
    query: "i tried a 44mm watch and it felt ridiculous on me. want something for weekends, max 12k. i dont know my wrist measurement so please give me somewhere to start",
    must: { priceMax: 12000 },
    replyChecks: ['suggest a smaller starting point without inventing a wrist measurement', 'mention trying the watch on before promising fit'],
    rubric: [
      { grade: 3, when: { diameterMax: 39, styleAny: ['sport', 'diver'] }, why: 'a smaller casual watch responds to both the fit experience and intended use' },
      { grade: 2, when: { diameterMax: 40 }, why: 'a useful smaller starting point, possibly dressier than requested' },
      { grade: 1, when: { diameterMax: 42 }, why: 'less of a size reduction and needs an explicit fit caveat' },
    ] },
  { id: 'r34', category: 'occasion',
    query: "black tie wedding next month. i normally wear a diver but it catches on my shirt cuff. up to 25k for something quieter that i'll wear again",
    must: { priceMax: 25000 },
    replyChecks: ['address cuff clearance without inventing case thickness', 'explain why the option also works after the event'],
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 39, functionsNone: ['chronograph'] }, why: 'a compact dress watch is a plausible formal alternative; cuff fit still needs verification' },
      { grade: 2, when: { styleAny: ['dress'], diameterMax: 41 }, why: 'fits the occasion with a size or complication trade-off' },
      { grade: 1, when: { styleAny: ['dress'] }, why: 'formal style alone does not establish better cuff clearance' },
    ] },
  { id: 'r35', category: 'collector',
    query: "i enjoy winding a watch, its part of the appeal. looking for a manual wind dress piece under 40k. simple looking from the front, interesting movement round the back",
    must: { movementAny: ['manual'], styleAny: ['dress'], priceMax: 40000 },
    replyChecks: ['respect the preference for manual winding', 'only describe a visible movement or finishing when supported by catalogue facts'],
    rubric: [
      { grade: 3, when: { caseBackAny: ['sapphire', 'transparent', 'see-through'], functionsNone: ['chronograph', 'perpetual', 'tourbillon'] }, why: 'a view of the movement with fewer complications is closer to the requested balance' },
      { grade: 2, when: { caseBackAny: ['sapphire', 'transparent', 'see-through'] }, why: 'offers the movement view but may have a busier front' },
      { grade: 1, when: {}, why: 'meets the explicit purchase requirements but the view or simplicity is unproven' },
    ] },
  { id: 'r36', category: 'budget_vibe',
    query: "i could spend 30k but honestly would be happier around 15. want a smart everyday watch, not something i'd save for special occasions. what would you shortlist?",
    must: { priceMax: 30000 },
    replyChecks: ['distinguish the preferred 15k spend from the 30k ceiling', 'explain any reason to spend more'],
    rubric: [
      { grade: 3, when: { priceMax: 15000, movementAny: ['automatic'], diameterMax: 41 }, why: 'serves daily wear while respecting the preferred spend' },
      { grade: 2, when: { priceMax: 20000, diameterMax: 42 }, why: 'a moderate stretch that needs a concrete benefit' },
      { grade: 1, when: {}, why: 'within the ceiling but weak unless the extra cost is justified' },
    ] },
  { id: 'r37', category: 'persona',
    query: "my mum wants a watch she can just put on, she won't remember to wind it and doesn't wear one every day. under 8k, something small and easy to live with",
    must: { priceMax: 8000 },
    replyChecks: ['discuss quartz as an option for intermittent wear', 'do not imply an automatic runs indefinitely when left unworn'],
    rubric: [
      { grade: 3, when: { movementAny: ['quartz'], diameterMax: 36 }, why: 'a small quartz watch directly addresses intermittent wear without winding' },
      { grade: 2, whenAny: [{ movementAny: ['quartz'], diameterMax: 39 }, { movementAny: ['automatic'], diameterMax: 36 }], why: 'either size or the need to reset after time off the wrist is a compromise' },
      { grade: 1, when: { diameterMax: 39 }, why: 'a small alternative whose winding needs may conflict with her routine' },
    ] },
  { id: 'r38', category: 'aesthetic',
    query: "not into rolex, nothing against them i just see them everywhere at work. want an everyday steel watch with some personality. up to 18k. what else is worth a look?",
    must: { excludeBrand: ['Rolex'], materialAny: ['steel'], priceMax: 18000 },
    replyChecks: ['keep Rolex out of the recommendations', 'describe concrete design differences instead of making unsupported rarity claims'],
    rubric: [
      { grade: 3, when: { movementAny: ['automatic'], diameterMax: 41, waterResistanceMin: 100 }, why: 'practical daily specifications in the requested material and budget' },
      { grade: 2, when: { movementAny: ['automatic'], diameterMax: 42 }, why: 'a wearable daily option with less water-resistance margin' },
      { grade: 1, when: {}, why: 'meets the stated limits but needs a stronger everyday-use explanation' },
    ] },
  { id: 'r39', category: 'lifestyle',
    query: "mostly t shirts and trainers, rarely a suit. i want a nice watch without looking like i'm dressed for the wrong occasion. around 10k, could stretch to 15 but no more",
    must: { priceMax: 15000 },
    replyChecks: ['match the casual wardrobe', 'explain any stretch beyond the preferred 10k'],
    rubric: [
      { grade: 3, when: { priceMax: 10000, styleAny: ['sport', 'diver'], materialAny: ['steel', 'titan'] }, why: 'a casual sports watch at the preferred spend fits the wardrobe' },
      { grade: 2, when: { styleAny: ['sport', 'diver'] }, why: 'fits the setting but may require the stretch budget or a material compromise' },
      { grade: 1, when: {}, why: 'affordable within the ceiling but less naturally suited to casual wear' },
    ] },
  { id: 'r40', category: 'budget_vibe',
    query: "some of these say price on request. i only have 12k so please stick to watches with an actual price below that. want something for work that doesnt feel too formal",
    must: { priceMax: 12000 },
    replyChecks: ['do not treat price on request as free or within budget', 'explain a balance between work and casual wear'],
    rubric: [
      { grade: 3, when: { styleAny: ['sport'], diameterMax: 40, materialAny: ['steel', 'titan'] }, why: 'a restrained sports watch bridges casual and office wear' },
      { grade: 2, when: { diameterMax: 41 }, why: 'a wearable office option but possibly more formal than preferred' },
      { grade: 1, when: {}, why: 'known price within budget, with a less obvious match to the setting' },
    ] },
];

// -- Handwritten set ----------------------------------------------------------
// Two halves, one per subsystem. The spec half reduces to facets even when the wording hides it,
// so the parser is expected to resolve it. The semantic half names no facet at all: its label is
// the judgement a knowledgeable salesperson would make, written down so it can be argued with.
// Labels are written from the brief, never from what a system returned for it.

export const HANDWRITTEN = [
  // ===========================================================================
  // SPEC SCOPE - Smart Search
  // ===========================================================================

  // Brand names as people type them: nicknames and misspellings.
  { id: 'h31', category: 'brand_alias', query: 'something from AP',
    truth: { brand: 'Audemars Piguet' } },
  { id: 'h32', category: 'brand_alias', query: 'JLC watches',
    truth: { brand: 'Jaeger-LeCoultre' } },
  { id: 'h33', category: 'brand_alias', query: 'patek philipe',
    truth: { brand: 'Patek Philippe' } },

  // Collection names on their own, including one that is mostly a number.
  { id: 'h34', category: 'collection', query: 'Nautilus',
    truth: { collection: 'Nautilus' } },
  { id: 'h35', category: 'collection', query: 'speedmaster',
    truth: { collection: 'Speedmaster' } },
  { id: 'h36', category: 'collection', query: 'lange 1',
    truth: { collection: 'Lange 1' } },

  // A style word has to land on the right collections, inside the named brand when there is one.
  { id: 'h37', category: 'style', query: 'sporty Patek Philippe',
    truth: { brand: 'Patek Philippe', styleAny: ['sport'] } },
  { id: 'h38', category: 'style', query: 'Rolex sports models',
    truth: { brand: 'Rolex', styleAny: ['sport'] } },
  { id: 'h39', category: 'style', query: 'a dive watch from Omega',
    truth: { brand: 'Omega', styleAny: ['diver'] } },
  { id: 'h05', category: 'style', query: 'a steel sports watch I can wear on the weekend',
    truth: { styleAny: ['sport', 'diver'], materialAny: ['steel', 'titan'] } },
  { id: 'h20', category: 'style', query: 'a dress watch on a metal bracelet, not a strap',
    truth: { styleAny: ['dress'], strapAny: ['bracelet'] } },

  // Water resistance stated as a use rather than in metres.
  { id: 'h04', category: 'water_resistance', query: 'something I can actually take diving, not just splash proof',
    truth: { waterResistanceMin: 200 } },
  { id: 'h40', category: 'water_resistance', query: 'a proper strong diver',
    truth: { waterResistanceMin: 300 } },
  // Swimming alone clears 100m on 28% of the catalogue, so the sports build is what separates it.
  { id: 'h41', category: 'water_resistance', query: 'a sports watch I can swim in',
    truth: { waterResistanceMin: 100, styleAny: ['sport', 'diver'] } },

  // Movement and power reserve.
  // A long weekend is about 70 hours off the wrist and the catalogue is dense there, so this label
  // is reported as too broad rather than narrowed until it passes.
  { id: 'h09', category: 'movement', query: 'an automatic I can leave off the wrist over a long weekend',
    truth: { movementAny: ['automatic'], powerReserveMin: 70 } },
  { id: 'h30', category: 'movement', query: 'a week of power reserve so it keeps running in the drawer',
    truth: { powerReserveMin: 120 } },
  { id: 'h42', category: 'movement', query: 'a hand-wound watch that runs for days',
    truth: { movementAny: ['manual'], powerReserveMin: 70 } },

  // Size in words, including a number spelled out.
  { id: 'h06', category: 'size', query: 'small enough for a thin wrist',
    truth: { diameterMax: 36 } },
  { id: 'h43', category: 'size', query: 'thirty-eight millimetres or smaller',
    truth: { diameterMax: 38 } },

  // Dial colour and dial type.
  { id: 'h16', category: 'dial', query: 'a deep blue face',
    truth: { dialAny: ['blue'] } },
  { id: 'h17', category: 'dial', query: 'classic black dial on a leather strap',
    truth: { dialAny: ['black'], strapAny: ['leather', 'alligator', 'calf'] } },
  { id: 'h19', category: 'dial', query: 'green dial sports watch on a bracelet',
    truth: { dialAny: ['green'] } },
  // Almost everything here has a sapphire caseback, so that label separates nothing.
  // The discriminating version of the same intent is a dial you can see through.
  { id: 'h10', category: 'dial', query: 'I want to see the mechanism from the front',
    truth: { dialAny: ['openworked', 'skeleton', 'sapphire'] } },

  // Complications in plain language. The generated set asks for "chronograph watches" by name,
  // so h12 and that query share a label and measure whether the wording changes the answer.
  { id: 'h12', category: 'complication', query: 'something that can time a lap',
    truth: { functionsAny: ['chronograph'] } },
  { id: 'h13', category: 'complication', query: 'a watch that shows the phases of the moon',
    truth: { functionsAny: ['moon'] } },
  { id: 'h14', category: 'complication', query: 'useful for tracking a second time zone when I travel',
    truth: { functionsAny: ['gmt', 'dual time', 'second time', 'world time', 'worldtime'] } },

  // Budget expressed conversationally.
  { id: 'h21', category: 'budget', query: 'the most affordable thing you have',
    truth: { priceMin: 1, priceMax: 12000 } },
  { id: 'h22', category: 'budget', query: 'my budget is around fifty thousand dollars',
    truth: { priceMin: 35000, priceMax: 65000 } },
  { id: 'h23', category: 'budget', query: 'money is no object, show me the top of the catalogue',
    truth: { priceMin: 150000 } },
  { id: 'h24', category: 'budget', query: 'nothing over twenty grand please',
    truth: { priceMin: 1, priceMax: 20000 } },

  // Negation and exclusion - the case that breaks naive vector search.
  { id: 'h25', category: 'exclusion', query: 'a dress watch under 40mm, but definitely not gold',
    truth: { styleAny: ['dress'], diameterMax: 40, materialNone: ['gold'] } },
  { id: 'h26', category: 'exclusion', query: 'a sports watch, anything except a chronograph',
    truth: { styleAny: ['sport', 'diver'], functionsNone: ['chronograph'] } },
  { id: 'h44', category: 'exclusion', query: 'anything but Rolex, under fifteen grand',
    truth: { excludeBrand: ['Rolex'], priceMin: 1, priceMax: 15000 } },
  // The matcher has no strap exclusion, so "not leather" is stated as the straps that remain.
  { id: 'h45', category: 'exclusion', query: 'a chronograph on a bracelet or rubber, not leather',
    truth: { functionsAny: ['chronograph'], strapAny: ['bracelet', 'rubber', 'oyster'] } },

  // Compound briefs - several constraints at once.
  { id: 'h11', category: 'compound', query: 'a steel watch with a date window',
    truth: { materialAny: ['steel'], functionsAny: ['date'] } },
  { id: 'h27', category: 'compound', query: 'steel automatic under 40mm with a date window',
    truth: { materialAny: ['steel'], movementAny: ['automatic'], diameterMax: 40, functionsAny: ['date'] } },
  { id: 'h28', category: 'compound', query: 'blue dial chronograph under thirty thousand',
    truth: { dialAny: ['blue'], functionsAny: ['chronograph'], priceMin: 1, priceMax: 30000 } },
  { id: 'h29', category: 'compound', query: 'rose gold dress watch on leather, 38mm or smaller',
    truth: { materialAny: ['rose gold', 'pink gold'], diameterMax: 38, strapAny: ['leather', 'alligator', 'calf'] } },
  { id: 'h46', category: 'compound', query: 'white gold perpetual calendar',
    truth: { materialAny: ['white gold'], functionsAny: ['perpetual calendar'] } },

  // ===========================================================================
  // SEMANTIC SCOPE - concierge
  // ===========================================================================
  //
  // Graded labels. `must` holds only what the brief states — a budget, a named brand, an explicit
  // exclusion — and breaking it is a violation, counted on its own line. `rubric` holds the reading
  // of the brief: grade 3 is what a knowledgeable salesperson brings out first, 2 fits with a
  // trade-off, 1 is defensible, anything else is 0. The `why` is the sentence the rubric is argued
  // from, and it is what a blind judge is shown.

  // Occasion.
  { id: 'h01', category: 'occasion', query: 'something understated I can wear to the office every day',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40, materialNone: ['gold', 'platin'] },
        why: 'a dress watch that stays quiet: modest case, no precious metal on show' },
      { grade: 2, when: { styleAny: ['dress'], diameterMax: 42 },
        why: 'reads dress at a desk, but larger or more precious than ideal' },
      { grade: 1, when: { diameterMax: 42 },
        why: 'discreet enough to wear to work even if it is not a dress watch' },
    ] },

  { id: 'h02', category: 'occasion', query: 'a dress watch with some complication, works with a suit',
    must: { styleAny: ['dress'] },
    rubric: [
      { grade: 3, when: { functionsAny: ['moon phase', 'perpetual calendar', 'annual calendar', 'chronograph'], diameterMax: 41 },
        why: 'a real complication in a case that still fits under a cuff' },
      { grade: 2, when: { functionsAny: ['moon', 'calendar', 'chronograph', 'power-reserve', 'second time zone', 'gmt'] },
        why: 'has a complication, size or type less suited to a suit' },
      { grade: 1, when: {}, why: 'a plain dress watch: right register, missing the complication asked for' },
    ] },

  { id: 'h47', category: 'occasion', query: 'what should I wear to my own wedding',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], materialAny: ['gold', 'platin'], diameterMax: 40,
                          strapAny: ['leather', 'alligator', 'calf', 'crocodile'] },
        why: 'formal dress code, photographed all day: precious case, classic size, leather' },
      { grade: 2, when: { styleAny: ['dress'], diameterMax: 41 },
        why: 'a dress watch that suits the day without the formal metal or strap' },
      { grade: 1, when: { styleAny: ['dress', 'art'] },
        why: 'dressy enough to defend, even if it is not what a groom would choose' },
    ] },

  { id: 'h48', category: 'occasion', query: "a watch for a job interview that won't look flashy",
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40, materialNone: ['gold', 'platin'],
                          functionsNone: ['tourbillon', 'minute repeater'] },
        why: 'nothing an interviewer would notice: steel-toned, modest, no showpiece complication' },
      { grade: 2, when: { styleAny: ['dress'], materialNone: ['gold', 'platin'] },
        why: 'quiet metal and register, larger or busier than ideal' },
      { grade: 1, when: { styleAny: ['dress'] }, why: 'a dress watch, though it may read as expensive' },
    ] },

  { id: 'h49', category: 'occasion', query: 'something for a black tie gala',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], materialAny: ['gold', 'platin'], diameterMax: 39,
                          functionsNone: ['chronograph'] },
        why: 'the most formal dress code there is: precious, slim, no stopwatch pushers' },
      { grade: 2, when: { styleAny: ['dress'] },
        why: 'a dress watch, in a metal or size that is not the formal choice' },
      { grade: 1, whenAny: [{ functionsNone: ['chronograph'], diameterMax: 42 },
                            { materialAny: ['gold', 'platin'], functionsNone: ['chronograph'] }],
        why: 'quiet enough to pass under a dinner jacket, or precious enough to carry the room' },
    ] },

  { id: 'h50', category: 'occasion', query: 'something to wear on a beach holiday',
    must: {},
    rubric: [
      { grade: 3, when: { waterResistanceMin: 100, strapAny: ['rubber', 'synthetic', 'bracelet', 'oyster'],
                          materialAny: ['steel', 'titan', 'ceramic'] },
        why: 'salt water and sunscreen: a hard case on a strap that can be rinsed' },
      { grade: 2, when: { waterResistanceMin: 100 }, why: 'takes the water, strap or case less suited to it' },
      { grade: 1, when: { waterResistanceMin: 50 }, why: 'survives a splash but not a swim' },
    ] },

  { id: 'h51', category: 'occasion', query: 'I fly between Sydney and London every month',
    must: {},
    rubric: [
      { grade: 3, when: { functionsAny: ['second time zone', 'world time', 'dual time', 'gmt', 'home time'] },
        why: 'monthly long-haul is the textbook case for reading a second time zone' },
      { grade: 2, whenAny: [{ functionsAny: ['date', 'annual calendar'], movementAny: ['automatic'], waterResistanceMin: 50 },
                            { styleAny: ['sport'], movementAny: ['automatic'] }],
        why: 'a robust everyday automatic that travels well without the complication' },
      { grade: 1, when: { movementAny: ['automatic'] }, why: 'wearable on the road, nothing about travel in it' },
    ] },

  { id: 'h52', category: 'occasion', query: 'relaxed weekend brunch but still looking put together',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['sport'], materialAny: ['steel', 'titan'], diameterMax: 42 },
        why: 'a steel sports watch at a size that is not a statement' },
      { grade: 2, whenAny: [{ styleAny: ['sport'] }, { styleAny: ['dress'], diameterMax: 42 }],
        why: 'either register works for brunch; this one leans one way or the other' },
      { grade: 1, when: { diameterMax: 44 }, why: 'wearable off duty without looking wrong' },
    ] },

  { id: 'h53', category: 'occasion', query: 'something for board meetings that says I have made it',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], materialAny: ['gold', 'platin'],
                          functionsAny: ['perpetual', 'moon', 'power-reserve', 'chronograph'] },
        why: 'precious case with a complication that the room reads as achievement' },
      { grade: 2, whenAny: [{ styleAny: ['dress'], materialAny: ['gold', 'platin'] },
                            { styleAny: ['dress'], functionsAny: ['perpetual', 'moon', 'tourbillon'] }],
        why: 'says it through the metal or the movement, not both' },
      { grade: 1, when: { styleAny: ['dress', 'art'] }, why: 'boardroom register without the signal' },
    ] },

  // Persona and gifting.
  { id: 'h03', category: 'persona', query: 'first serious watch for someone starting a collection',
    must: {},
    rubric: [
      { grade: 3, when: { priceMax: 15000, movementAny: ['automatic'] },
        why: 'entry of the catalogue and mechanical, which is what makes it the first serious one' },
      { grade: 2, when: { priceMax: 25000, movementAny: ['automatic'] },
        why: 'mechanical, priced above where most people start' },
      { grade: 1, when: { priceMax: 35000 }, why: 'a defensible first purchase at a stretch' },
    ] },

  { id: 'h54', category: 'persona', query: 'a graduation gift for my son, around five thousand',
    must: { priceMax: 10000 },
    rubric: [
      { grade: 3, when: { priceMin: 3900, priceMax: 6500 }, why: 'around five thousand, read as the band the catalogue actually offers' },
      { grade: 2, when: { priceMin: 2500, priceMax: 8000 }, why: 'near the number without being it' },
      { grade: 1, when: {}, why: 'inside the outer bound a gift budget stretches to' },
    ] },

  { id: 'h55', category: 'persona', query: 'an anniversary present for my wife, she has a slim wrist',
    must: {},
    rubric: [
      { grade: 3, when: { diameterMax: 36, materialAny: ['gold', 'platin'] },
        why: 'sized for a slim wrist, in a metal an anniversary asks for' },
      { grade: 2, when: { diameterMax: 38 }, why: 'wears small enough, metal is not the occasion' },
      { grade: 1, when: { diameterMax: 40 }, why: 'borderline on the wrist' },
    ] },

  { id: 'h56', category: 'persona', query: 'a retirement gift for my dad, he likes classic things',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], materialAny: ['yellow gold', 'rose gold', 'pink gold'],
                          strapAny: ['leather', 'alligator', 'calf', 'crocodile'] },
        why: 'classic to that generation is warm gold on leather' },
      { grade: 2, when: { styleAny: ['dress'], materialAny: ['gold', 'platin'] },
        why: 'precious dress watch, strap or tone less traditional' },
      { grade: 1, when: { styleAny: ['dress'] }, why: 'classic register in a plainer metal' },
    ] },

  { id: 'h57', category: 'persona', query: 'something for a young professional who just got promoted',
    must: {},
    rubric: [
      { grade: 3, when: { priceMin: 5000, priceMax: 25000 }, why: 'a first promotion widens the budget without haute horlogerie' },
      { grade: 2, when: { priceMin: 3000, priceMax: 40000 }, why: 'plausible for the occasion, above or below the band' },
      { grade: 1, when: { priceMax: 60000 }, why: 'a stretch, but not absurd for the milestone' },
    ] },

  { id: 'h59', category: 'persona', query: 'my husband is a surgeon and washes his hands all day',
    must: {},
    rubric: [
      { grade: 3, when: { waterResistanceMin: 100, strapAny: ['rubber', 'synthetic', 'bracelet', 'oyster'], diameterMax: 41 },
        why: 'constant water rules out leather; a modest case stays out of the way' },
      { grade: 2, when: { waterResistanceMin: 100 }, why: 'handles the water, strap or size less suited' },
      { grade: 1, when: { waterResistanceMin: 50 }, why: 'survives hand washing, not a habit of it' },
    ] },

  { id: 'h60', category: 'persona', query: 'I just want a reliable everyday watch with no fuss',
    must: {},
    rubric: [
      { grade: 3, when: { movementAny: ['automatic'], waterResistanceMin: 100, materialAny: ['steel', 'titan'] },
        why: 'self-winding, water resistant enough to forget about, in a hard-wearing case' },
      { grade: 2, when: { movementAny: ['automatic'], waterResistanceMin: 50 }, why: 'low fuss, less robust' },
      { grade: 1, when: { movementAny: ['automatic'] }, why: 'no winding to remember, nothing else about it is everyday' },
    ] },

  // Aesthetic.
  { id: 'h07', category: 'aesthetic', query: 'a bold statement piece with real wrist presence',
    must: {},
    rubric: [
      { grade: 3, when: { diameterMin: 44 }, why: 'presence is size first' },
      { grade: 2, when: { diameterMin: 42 }, why: 'large, short of a statement' },
      { grade: 1, whenAny: [{ diameterMin: 40 }, { functionsAny: ['tourbillon', 'minute repeater'] }],
        why: 'makes itself noticed through the movement rather than the case' },
    ] },

  { id: 'h08', category: 'aesthetic', query: 'something warm looking on a leather strap, not cold steel',
    must: { materialNone: ['steel'], strapAny: ['leather', 'alligator', 'calf', 'crocodile'] },
    rubric: [
      { grade: 3, when: { materialAny: ['rose gold', 'pink gold', 'yellow gold'] }, why: 'warm metal, as asked' },
      { grade: 2, when: { materialAny: ['gold', 'platin', 'bronze'] }, why: 'precious but cooler in tone' },
      { grade: 1, when: {}, why: 'on leather and not steel, which is what was ruled out' },
    ] },

  { id: 'h15', category: 'aesthetic', query: 'a clean dress dial with nothing on it but the hands',
    must: { styleAny: ['dress'] },
    rubric: [
      { grade: 3, when: { functionsNone: ['chronograph', 'moon', 'perpetual', 'calendar', 'date', 'seconds', 'power-reserve'] },
        why: 'time only: even a seconds register breaks the brief' },
      { grade: 2, when: { functionsNone: ['chronograph', 'moon', 'perpetual', 'calendar', 'power-reserve'] },
        why: 'close to bare, keeps a small seconds or a date' },
      { grade: 1, when: {}, why: 'a dress dial, busier than asked' },
    ] },

  { id: 'h18', category: 'aesthetic', query: 'silver or white dial, very traditional',
    must: { dialAny: ['silver', 'white'] },
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40 }, why: 'the traditional reading: a classic dress case' },
      { grade: 2, when: { styleAny: ['dress'] }, why: 'dress register, larger than traditional' },
      { grade: 1, when: {}, why: 'right dial, wrong register' },
    ] },

  { id: 'h61', category: 'aesthetic', query: 'minimalist and clean, nothing fussy on the dial',
    must: {},
    rubric: [
      { grade: 3, when: { diameterMax: 40, functionsNone: ['chronograph', 'moon', 'perpetual', 'calendar', 'tourbillon', 'power-reserve', 'date'] },
        why: 'few indications and a modest case' },
      { grade: 2, when: { diameterMax: 42, functionsNone: ['chronograph', 'moon', 'perpetual', 'tourbillon'] },
        why: 'uncluttered, keeps a date or a power reserve' },
      { grade: 1, when: { functionsNone: ['chronograph', 'tourbillon', 'minute repeater'] }, why: 'not busy, not minimal either' },
    ] },

  { id: 'h62', category: 'aesthetic', query: 'sporty but refined enough for a nice dinner',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['sport'], materialAny: ['gold', 'platin'] }, why: 'a sports watch turned precious is the whole brief' },
      { grade: 2, when: { styleAny: ['sport'], diameterMax: 42 }, why: 'sporty and restrained, in steel' },
      { grade: 1, when: { styleAny: ['sport'] }, why: 'sporty, refinement not obvious' },
    ] },

  { id: 'h63', category: 'aesthetic', query: 'stealth wealth, luxury only people in the know would spot',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], materialAny: ['white gold', 'platin'] },
        why: 'precious metal that reads as steel across the table' },
      { grade: 2, whenAny: [{ styleAny: ['dress'], materialAny: ['titan'] },
                            { styleAny: ['sport'], materialAny: ['platin', 'white gold'] }],
        why: 'quiet metal, register slightly off the brief' },
      { grade: 1, when: { materialNone: ['yellow gold', 'rose gold', 'pink gold'] }, why: 'at least it does not shout' },
    ] },

  { id: 'h64', category: 'aesthetic', query: 'something that looks like a piece of jewellery',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['art'], materialAny: ['gold', 'platin'], diameterMax: 38 },
        why: 'an artistic piece in a precious case at a delicate size' },
      { grade: 2, whenAny: [{ styleAny: ['art'] }, { materialAny: ['gold', 'platin'], diameterMax: 36 }],
        why: 'jewellery-like through the decoration or the size, not both' },
      { grade: 1, when: { materialAny: ['gold', 'platin'] }, why: 'precious, but reads as a watch' },
    ] },

  { id: 'h65', category: 'aesthetic', query: 'a watch with a really colourful dial',
    must: {},
    rubric: [
      { grade: 3, when: { dialAny: ['green', 'red', 'salmon', 'turquoise', 'purple', 'orange', 'burgundy', 'aventurine', 'meteorite', 'enamel'] },
        why: 'a colour the catalogue rarely uses, which is what "really colourful" means here' },
      { grade: 2, when: { dialAny: ['blue', 'brown', 'champagne', 'bronze', 'chocolate'] },
        why: 'coloured rather than neutral, but common' },
      { grade: 1, when: { dialAny: ['grey', 'gray', 'slate', 'anthracite', 'mother-of-pearl'] },
        why: 'a tone rather than a colour' },
    ] },

  // Lifestyle.
  { id: 'h66', category: 'lifestyle', query: 'something tough for hiking and camping',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['sport', 'diver'], materialAny: ['titan', 'steel', 'ceramic'], waterResistanceMin: 100 },
        why: 'a hard case, a sports build and enough water resistance for rain and rivers' },
      { grade: 2, when: { styleAny: ['sport', 'diver'], waterResistanceMin: 50 }, why: 'built for outdoors, softer on one count' },
      { grade: 1, when: { waterResistanceMin: 50 }, why: 'would survive the trip' },
    ] },

  { id: 'h67', category: 'lifestyle', query: 'I race sailboats on weekends',
    must: {},
    rubric: [
      { grade: 3, when: { functionsAny: ['chronograph'], waterResistanceMin: 100 },
        why: 'race starts run on a countdown, and it gets wet' },
      { grade: 2, whenAny: [{ functionsAny: ['chronograph'] }, { waterResistanceMin: 100, styleAny: ['sport', 'diver'] }],
        why: 'times the start or takes the water, not both' },
      { grade: 1, when: { waterResistanceMin: 50 }, why: 'survives spray, no use for the race' },
    ] },

  { id: 'h68', category: 'lifestyle', query: 'something light I can play golf in',
    must: {},
    rubric: [
      { grade: 3, when: { materialAny: ['titan', 'ceramic', 'carbon'], diameterMax: 42 },
        why: 'a golf swing punishes weight: a light case, not a large one' },
      { grade: 2, whenAny: [{ materialAny: ['titan', 'ceramic', 'carbon'] }, { diameterMax: 40, materialAny: ['steel'] }],
        why: 'light through the metal or through the size, not both' },
      { grade: 1, when: { diameterMax: 42 }, why: 'wearable on a course' },
    ] },

  { id: 'h69', category: 'lifestyle', query: 'I go to the gym every morning before work',
    must: {},
    rubric: [
      { grade: 3, when: { strapAny: ['rubber', 'synthetic'], waterResistanceMin: 50, styleAny: ['sport', 'diver'] },
        why: 'sweat every morning: a strap that wipes clean on a sports build' },
      { grade: 2, when: { waterResistanceMin: 50, styleAny: ['sport', 'diver'] }, why: 'sports build, strap less suited' },
      { grade: 1, when: { waterResistanceMin: 50 }, why: 'would survive being worn, not chosen for it' },
    ] },

  { id: 'h70', category: 'lifestyle', query: 'I work with my hands and knock my watch a lot',
    must: {},
    rubric: [
      { grade: 3, when: { materialAny: ['ceramic', 'titan'], styleAny: ['sport', 'diver'] },
        why: 'knocks are what ceramic and titanium sports cases are for' },
      { grade: 2, when: { styleAny: ['sport', 'diver'], waterResistanceMin: 100 }, why: 'built to be used, in a softer metal' },
      { grade: 1, when: { styleAny: ['sport', 'diver'] }, why: 'a sports watch, hardness unproven' },
    ] },

  { id: 'h71', category: 'lifestyle', query: 'a watch I can wear running and swimming',
    must: {},
    rubric: [
      { grade: 3, when: { waterResistanceMin: 100, strapAny: ['rubber', 'synthetic'] },
        why: 'swims and runs: a sports strap and real water resistance' },
      { grade: 2, when: { waterResistanceMin: 100 }, why: 'takes the water, strap is wrong for sweat' },
      { grade: 1, when: { waterResistanceMin: 50 }, why: 'running yes, swimming no' },
    ] },

  // Collector and horology.
  { id: 'h72', category: 'collector', query: 'an heirloom to pass down to my grandchildren',
    must: {},
    rubric: [
      { grade: 3, when: { materialAny: ['gold', 'platin'], functionsAny: ['perpetual calendar', 'moon', 'minute repeater', 'tourbillon'] },
        why: 'a precious case with a complication that keeps meaning something for decades' },
      { grade: 2, when: { materialAny: ['gold', 'platin'] }, why: 'precious and lasting, plainer movement' },
      { grade: 1, when: { functionsAny: ['perpetual', 'tourbillon', 'minute repeater', 'moon'] }, why: 'worth keeping for the movement alone' },
    ] },

  { id: 'h73', category: 'collector', query: 'a true haute horlogerie showpiece',
    must: {},
    rubric: [
      { grade: 3, when: { functionsAny: ['tourbillon', 'minute repeater', 'grande sonnerie', 'split-seconds', 'rattrapante'] },
        why: 'showpieces are defined by the complication' },
      { grade: 2, whenAny: [{ functionsAny: ['perpetual calendar', 'equation', 'constant force', 'remontoir'] }, { styleAny: ['art'] }],
        why: 'serious watchmaking, one step below the headline complications' },
      { grade: 1, when: { materialAny: ['gold', 'platin'] }, why: 'a fine watch, not a showpiece' },
    ] },

  { id: 'h74', category: 'collector', query: 'something from an independent watchmaker',
    must: {},
    rubric: [
      { grade: 3, when: { brandIn: ['F.P.Journe', 'Greubel Forsey'] }, why: 'the independents in this catalogue' },
    ] },

  { id: 'h75', category: 'collector', query: 'the best of German watchmaking',
    must: {},
    rubric: [
      { grade: 3, when: { brand: 'A. Lange & Söhne' }, why: 'the German house that defines the answer' },
      { grade: 2, when: { brand: 'Glashütte Original' }, why: 'German, from the same town, a tier below in reputation' },
    ] },

  { id: 'h76', category: 'collector', query: 'Japanese craftsmanship',
    must: {},
    rubric: [
      { grade: 3, when: { brand: 'Grand Seiko' }, why: 'the only Japanese maison in the catalogue' },
    ] },

  { id: 'h77', category: 'collector', query: 'a watch with hand-finished artistic decoration',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['art'], dialAny: ['enamel', 'engrav', 'guilloch', 'openwork', 'lacquer'] },
        why: 'decoration done by hand, on the dial where it shows' },
      { grade: 2, whenAny: [{ styleAny: ['art'] }, { dialAny: ['enamel', 'engrav', 'guilloch', 'openwork', 'lacquer', 'skeleton'] }],
        why: 'artistic through the collection or the dial, not both' },
      { grade: 1, when: { functionsAny: ['tourbillon', 'minute repeater'] }, why: 'finishing lives in the movement instead' },
    ] },

  { id: 'h78', category: 'collector', query: 'something likely to hold its value',
    must: {},
    rubric: [
      { grade: 3, when: { brandIn: ['Patek Philippe', 'Rolex', 'Audemars Piguet'], styleAny: ['sport'], materialAny: ['steel'] },
        why: 'value retention is concentrated in the steel sports icons of three houses' },
      { grade: 2, when: { brandIn: ['Patek Philippe', 'Rolex', 'Audemars Piguet'] }, why: 'the right houses, not the models that hold best' },
      { grade: 1, when: { brandIn: ['Vacheron Constantin', 'A. Lange & Söhne', 'F.P.Journe', 'Omega'] },
        why: 'a name that holds something, without the demand of the top three' },
    ] },

  { id: 'h79', category: 'collector', query: 'the most complicated watch you have',
    must: {},
    rubric: [
      { grade: 3, when: { functionsAll: ['perpetual calendar'], functionsAny: ['chronograph', 'tourbillon', 'minute repeater'] },
        why: 'two major complications in one movement is as far as this catalogue goes' },
      { grade: 2, when: { functionsAny: ['perpetual calendar', 'minute repeater', 'tourbillon', 'split-seconds'] },
        why: 'one major complication' },
      { grade: 1, when: { functionsAny: ['chronograph', 'moon', 'annual calendar', 'gmt', 'world time'] },
        why: 'complicated in the everyday sense' },
    ] },

  { id: 'h58', category: 'collector', query: 'an unusual way of showing the time',
    must: {},
    rubric: [
      { grade: 3, when: { functionsAny: ['jumping', 'retrograde', 'digital', 'regulator', 'wandering'] },
        why: 'the display itself is the answer: the hands are replaced or made to jump' },
      { grade: 2, whenAny: [{ styleAny: ['art'] }, { functionsAny: ['world time', 'equation', 'moon'] }],
        why: 'reads differently from a three-hander without changing how time is shown' },
      { grade: 1, when: { functionsAny: ['tourbillon', 'openwork'] }, why: 'unusual to look at, conventional to read' },
    ] },

  // Fit and suitability.
  { id: 'h80', category: 'fit', query: 'my wrist is only about 15cm around',
    must: {},
    rubric: [
      { grade: 3, when: { diameterMax: 37 }, why: 'a 15 cm wrist carries about 37 mm without overhang' },
      { grade: 2, when: { diameterMax: 39 }, why: 'wearable, filling the wrist' },
      { grade: 1, when: { diameterMax: 41 }, why: 'oversized on that wrist but not absurd' },
    ] },

  { id: 'h81', category: 'fit', query: 'I have big wrists and most watches look tiny on me',
    must: {},
    rubric: [
      { grade: 3, when: { diameterMin: 43 }, why: 'large wrists need 43 mm before a watch stops looking small' },
      { grade: 2, when: { diameterMin: 41 }, why: 'holds its own without presence' },
      { grade: 1, when: { diameterMin: 40 }, why: 'the smallest that would not disappear' },
    ] },

  { id: 'h82', category: 'fit', query: 'it has to slip under a shirt cuff',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 39, functionsNone: ['chronograph'] },
        why: 'a slim dress case with nothing sticking out of the side' },
      { grade: 2, when: { diameterMax: 40, functionsNone: ['chronograph'] }, why: 'small enough, not built for a cuff' },
      { grade: 1, when: { diameterMax: 42 }, why: 'fits under a loose cuff' },
    ] },

  { id: 'h83', category: 'fit', query: 'something that will not scratch easily',
    must: {},
    rubric: [
      { grade: 3, when: { materialAny: ['ceramic'] }, why: 'ceramic is what scratch resistance is chosen for' },
      { grade: 2, when: { materialAny: ['titan', 'carbon', 'tantalum'] }, why: 'harder wearing than steel, softer than ceramic' },
      { grade: 1, when: { materialAny: ['steel'] }, why: 'marks, but takes it' },
    ] },

  { id: 'h84', category: 'fit', query: "a watch designed for a woman, not a shrunk-down men's watch",
    must: {},
    rubric: [
      { grade: 3, when: { diameterMax: 36, styleAny: ['art', 'dress'] },
        why: 'designed small rather than scaled down, with decoration of its own' },
      { grade: 2, when: { diameterMax: 38 }, why: 'sized for the brief, generic in design' },
      { grade: 1, when: { diameterMax: 40 }, why: 'wearable, still a unisex case' },
    ] },

  // Budget with a vibe: the number is stated, so it is a constraint; the vibe is graded.
  { id: 'h87', category: 'budget_vibe', query: 'something elegant under fifteen thousand',
    must: { priceMax: 15000 },
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40 }, why: 'elegant reads as a classic dress case' },
      { grade: 2, when: { styleAny: ['dress'] }, why: 'dress register, larger than elegant' },
      { grade: 1, when: { styleAny: ['dress', 'art'] }, why: 'not sporty, which is the least the brief asks' },
    ] },

  { id: 'h88', category: 'budget_vibe', query: 'a luxurious sports watch around fifty grand',
    must: { priceMin: 25000, priceMax: 80000 },
    rubric: [
      { grade: 3, when: { styleAny: ['sport'], priceMin: 40000, priceMax: 60000 }, why: 'a sports watch at the number, in the luxury tier' },
      { grade: 2, when: { styleAny: ['sport'] }, why: 'the right kind of watch, off the number' },
      { grade: 1, when: {}, why: 'inside the band, wrong register' },
    ] },

  { id: 'h89', category: 'budget_vibe', query: 'my first step into haute horlogerie, under a hundred thousand',
    must: { priceMax: 100000 },
    rubric: [
      { grade: 3, when: { priceMin: 30000, functionsAny: ['perpetual', 'tourbillon', 'minute repeater', 'moon', 'split-seconds'] },
        why: 'a real complication at the entry of haute horlogerie' },
      { grade: 2, when: { priceMin: 20000 }, why: 'the tier, without the complication that defines it' },
      { grade: 1, when: {}, why: 'inside the budget, below the tier' },
    ] },

  { id: 'h90', category: 'budget_vibe', query: 'the cheapest proper dive watch you have',
    must: { waterResistanceMin: 100 },
    rubric: [
      { grade: 3, when: { styleAny: ['diver'], priceMax: 12000 }, why: 'a real diver at the bottom of the range' },
      { grade: 2, when: { styleAny: ['diver'] }, why: 'a proper diver, not the cheapest' },
      { grade: 1, when: { styleAny: ['sport'] }, why: 'takes the water without being built for diving' },
    ] },

  { id: 'h91', category: 'budget_vibe', query: 'something special for about thirty thousand, not a sports watch',
    must: { priceMin: 15000, priceMax: 50000, styleNone: ['sport', 'diver'] },
    rubric: [
      { grade: 3, when: { priceMin: 25000, priceMax: 35000, styleAny: ['dress', 'art'] }, why: 'at the number, and special rather than everyday' },
      { grade: 2, when: { priceMin: 20000, priceMax: 40000 }, why: 'near the number, inside what was not ruled out' },
      { grade: 1, when: {}, why: 'inside the band and not a sports watch' },
    ] },
];

// -- The former test set -----------------------------------------------------
//
// These 80 briefs were the held-out set until 2026-09-30, and by then both halves had been read.
// The open-ended half found defects that were fixed on 2026-09-23/24, and the first run of the
// facet half named the briefs it failed in docs/eval-results.md. A set that has steered changes
// measures fit to itself, so it moved here, where fixing what it shows is allowed. Ids are
// unchanged so the run files recorded against it still rescore. test-set.mjs holds its replacement.

export const FORMER_TEST = [
  // -- Open-ended half, graded -------------------------------------------------
  // -- Occasion ---------------------------------------------------------------
  { id: 'f01', category: 'occasion', query: "meeting my girlfriend's parents for the first time",
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40, materialNone: ['gold', 'platin'] },
        why: 'polite and unshowy: a modest dress watch that does not announce money' },
      { grade: 2, when: { styleAny: ['dress'] }, why: 'right register, louder metal or larger case' },
      { grade: 1, when: { diameterMax: 42 }, why: 'inoffensive enough for the afternoon' },
    ] },

  { id: 'f02', category: 'occasion', query: "I'm best man at a beach wedding in Fiji",
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 41, waterResistanceMin: 50 },
        why: 'formal enough for the party, able to survive sand and humidity' },
      { grade: 2, when: { styleAny: ['dress'] }, why: 'dressed for the day, not for the beach' },
      { grade: 1, when: { waterResistanceMin: 100 }, why: 'survives the setting, misses the occasion' },
    ] },

  { id: 'f03', category: 'occasion', query: 'dinner at a Michelin place, I want something quietly impressive',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], materialAny: ['white gold', 'platin'], diameterMax: 40 },
        why: 'quiet and expensive at once, which is what precious metal in a plain case does' },
      { grade: 2, when: { styleAny: ['dress'], materialAny: ['gold', 'platin'] }, why: 'impressive, less quiet' },
      { grade: 1, when: { styleAny: ['dress'] }, why: 'correct for the table without the weight' },
    ] },

  { id: 'f04', category: 'occasion', query: 'client presentations all week, nothing that distracts',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40, materialNone: ['gold', 'platin'],
                          functionsNone: ['chronograph', 'tourbillon'] },
        why: 'nothing on the wrist for a client to look at instead of the slides' },
      { grade: 2, when: { styleAny: ['dress'], materialNone: ['gold', 'platin'] }, why: 'quiet metal, busier face' },
      { grade: 1, when: { styleAny: ['dress'] }, why: 'business register, more presence than asked for' },
    ] },

  { id: 'f05', category: 'occasion', query: 'my 40th birthday, I want to mark it with something',
    must: {},
    rubric: [
      { grade: 3, when: { materialAny: ['gold', 'platin'], functionsAny: ['perpetual calendar', 'moon phase', 'tourbillon'] },
        why: 'a milestone piece: precious, and with a movement worth explaining' },
      { grade: 2, when: { materialAny: ['gold', 'platin'] }, why: 'precious enough to mark the date' },
      { grade: 1, when: { functionsAny: ['moon phase', 'perpetual calendar', 'chronograph', 'tourbillon'] },
        why: 'memorable through the movement rather than the metal' },
    ] },

  { id: 'f06', category: 'occasion', query: 'weekend away in the mountains, cold and wet',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['sport', 'diver'], materialAny: ['steel', 'titan', 'ceramic'], waterResistanceMin: 100 },
        why: 'rain, rock and cold: a hard case with real water resistance' },
      { grade: 2, when: { styleAny: ['sport', 'diver'], waterResistanceMin: 50 }, why: 'built for outdoors, softer on one count' },
      { grade: 1, when: { waterResistanceMin: 100 }, why: 'would survive the weekend' },
    ] },

  // -- Persona ----------------------------------------------------------------
  { id: 'f07', category: 'persona', query: 'a present for my mother, who has never worn a watch',
    must: {},
    rubric: [
      { grade: 3, when: { diameterMax: 36, styleAny: ['dress', 'art'] },
        why: 'a first watch should wear small and look like an object, not equipment' },
      { grade: 2, when: { diameterMax: 38 }, why: 'wears small, plainer in design' },
      { grade: 1, when: { diameterMax: 40 }, why: 'wearable, larger than a first watch should be' },
    ] },

  { id: 'f08', category: 'persona', query: 'my brother just qualified as a doctor, budget about ten thousand',
    must: { priceMax: 15000 },
    rubric: [
      { grade: 3, when: { priceMin: 7000, priceMax: 12000 }, why: 'at the number he named' },
      { grade: 2, when: { priceMin: 4000, priceMax: 15000 }, why: 'inside the budget, off the number' },
      { grade: 1, when: {}, why: 'affordable within the outer bound' },
    ] },

  { id: 'f09', category: 'persona', query: 'something for my husband, who will only ever own one watch',
    must: {},
    rubric: [
      { grade: 3, when: { movementAny: ['automatic'], waterResistanceMin: 100, materialAny: ['steel', 'titan'] },
        why: 'the only watch has to take everything: mechanical, sealed, hard-wearing' },
      { grade: 2, when: { movementAny: ['automatic'], waterResistanceMin: 50 }, why: 'covers most of a life, less robust' },
      { grade: 1, when: { movementAny: ['automatic'] }, why: 'mechanical, narrower in use' },
    ] },

  { id: 'f10', category: 'persona', query: 'a gift for a friend who collects nothing but cares about design',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['art'], diameterMax: 41 }, why: 'bought as an object, not as a collection piece' },
      { grade: 2, when: { styleAny: ['art', 'dress'], diameterMax: 40 }, why: 'considered design in a familiar register' },
      { grade: 1, when: { diameterMax: 42 }, why: 'a handsome watch with nothing to say about design' },
    ] },

  { id: 'f11', category: 'persona', query: "I'm a student, this would be my first real watch, under five thousand",
    must: { priceMax: 5000 },
    rubric: [
      { grade: 3, when: { movementAny: ['automatic'] }, why: 'a first real watch should be mechanical' },
      { grade: 2, when: {}, why: 'inside the budget, not mechanical' },
    ] },

  { id: 'f12', category: 'persona', query: "retirement present from the team, we've pooled about twenty thousand",
    must: { priceMax: 25000 },
    rubric: [
      { grade: 3, when: { priceMin: 12000, priceMax: 22000, styleAny: ['dress'] },
        why: 'at the number, and dressy enough to read as a send-off' },
      { grade: 2, when: { priceMin: 8000 }, why: 'a serious gift, off the register or the number' },
      { grade: 1, when: {}, why: 'within what was pooled' },
    ] },

  // -- Aesthetic ---------------------------------------------------------------
  { id: 'f13', category: 'aesthetic', query: 'I like watches that look like instruments, not jewellery',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['sport', 'diver'], materialNone: ['gold', 'platin'],
                          functionsAny: ['chronograph', 'second time zone', 'power-reserve'] },
        why: 'a tool face: readable, functional, no precious metal' },
      { grade: 2, when: { styleAny: ['sport', 'diver'], materialNone: ['gold', 'platin'] }, why: 'tool register, plainer dial' },
      { grade: 1, when: { materialNone: ['gold', 'platin'] }, why: 'at least it is not jewellery' },
    ] },

  { id: 'f14', category: 'aesthetic', query: 'a green dial, nothing else matters',
    must: { dialAny: ['green'] },
    rubric: [
      { grade: 3, when: {}, why: 'the brief is the dial colour and nothing else' },
    ] },

  { id: 'f15', category: 'aesthetic', query: 'openworked, I want to see it working',
    must: {},
    rubric: [
      { grade: 3, when: { dialAny: ['openwork', 'skeleton'] }, why: 'the movement is the dial' },
      { grade: 2, when: { caseBackAny: ['sapphire', 'transparent', 'see-through'], functionsAny: ['tourbillon', 'perpetual calendar'] },
        why: 'the movement shows, from the back' },
      { grade: 1, when: { caseBackAny: ['sapphire', 'transparent', 'see-through'] }, why: 'visible, if you take it off' },
    ] },

  { id: 'f16', category: 'aesthetic', query: "something vintage looking, like my grandfather's",
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 38, materialAny: ['yellow gold', 'rose gold', 'pink gold'],
                          strapAny: ['leather', 'alligator', 'calf', 'crocodile'] },
        why: 'the watch of that generation: small, warm gold, on leather' },
      { grade: 2, when: { styleAny: ['dress'], diameterMax: 39 }, why: 'period proportions in a modern metal' },
      { grade: 1, when: { styleAny: ['dress'] }, why: 'classic register, contemporary size' },
    ] },

  { id: 'f17', category: 'aesthetic', query: 'black on black, as dark as you have',
    must: {},
    rubric: [
      { grade: 3, when: { dialAny: ['black'], materialAny: ['ceramic', 'carbon', 'titan'] },
        why: 'dark dial in a dark case, which is as far as the catalogue goes' },
      { grade: 2, when: { dialAny: ['black'], materialNone: ['gold', 'platin'] }, why: 'black face, steel case' },
      { grade: 1, when: { dialAny: ['black'] }, why: 'black dial, precious case working against the brief' },
    ] },

  { id: 'f18', category: 'aesthetic', query: 'I hate date windows',
    must: { functionsNone: ['date'] },
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 41 }, why: 'a clean face is what the complaint is really about' },
      { grade: 2, when: {}, why: 'no date, whatever else it is' },
    ] },

  // -- Lifestyle ---------------------------------------------------------------
  { id: 'f19', category: 'lifestyle', query: 'I ride motorbikes on weekends',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['sport', 'diver'], waterResistanceMin: 100, materialAny: ['steel', 'titan', 'ceramic'] },
        why: 'vibration, weather and gloves: a sealed sports case' },
      { grade: 2, when: { styleAny: ['sport', 'diver'] }, why: 'the right kind of watch, less sealed' },
      { grade: 1, when: { waterResistanceMin: 100 }, why: 'survives the ride' },
    ] },

  { id: 'f20', category: 'lifestyle', query: "I'm in and out of the ocean all summer",
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['diver'], waterResistanceMin: 200 }, why: 'salt water daily is what a diver is built for' },
      { grade: 2, when: { waterResistanceMin: 100 }, why: 'swims safely without being a diver' },
      { grade: 1, when: { waterResistanceMin: 50 }, why: 'splashes only' },
    ] },

  { id: 'f21', category: 'lifestyle', query: 'long haul flights twice a month for work',
    must: {},
    rubric: [
      { grade: 3, when: { functionsAny: ['second time zone', 'world time', 'gmt', 'dual time', 'home time'] },
        why: 'two time zones is the whole problem' },
      { grade: 2, when: { movementAny: ['automatic'], waterResistanceMin: 50 }, why: 'a dependable travel companion without the complication' },
      { grade: 1, when: { movementAny: ['automatic'] }, why: 'travels fine, says nothing about the brief' },
    ] },

  { id: 'f22', category: 'lifestyle', query: "I teach, so I'm writing on a whiteboard all day",
    must: {},
    rubric: [
      { grade: 3, when: { diameterMax: 40, materialAny: ['steel', 'titan', 'ceramic'], waterResistanceMin: 50 },
        why: 'an arm raised all day wants a small hard case that shrugs off knocks' },
      { grade: 2, when: { diameterMax: 41 }, why: 'stays out of the way, softer case' },
      { grade: 1, when: { diameterMax: 42 }, why: 'wearable through a teaching day' },
    ] },

  { id: 'f23', category: 'lifestyle', query: 'I cycle to work in all weather',
    must: {},
    rubric: [
      { grade: 3, when: { waterResistanceMin: 100, styleAny: ['sport', 'diver'], strapAny: ['rubber', 'synthetic', 'bracelet'] },
        why: 'rain and sweat: a sealed case on a strap that does not mind either' },
      { grade: 2, when: { waterResistanceMin: 100 }, why: 'handles the weather, strap will not enjoy it' },
      { grade: 1, when: { waterResistanceMin: 50 }, why: 'fine on a dry day' },
    ] },

  { id: 'f24', category: 'lifestyle', query: 'weekend woodworking, the watch takes a beating',
    must: {},
    rubric: [
      { grade: 3, when: { materialAny: ['ceramic', 'titan'], styleAny: ['sport', 'diver'] },
        why: 'hard materials on a case built to be knocked' },
      { grade: 2, when: { styleAny: ['sport', 'diver'], waterResistanceMin: 100 }, why: 'built for use, in a softer metal' },
      { grade: 1, when: { styleAny: ['sport', 'diver'] }, why: 'a sports watch, hardness unproven' },
    ] },

  // -- Collector ---------------------------------------------------------------
  { id: 'f25', category: 'collector', query: "I already own a steel sports watch, what's the step up from here",
    must: {},
    rubric: [
      { grade: 3, when: { brandIn: ['Patek Philippe', 'Audemars Piguet', 'Vacheron Constantin', 'A. Lange & Söhne'],
                          styleAny: ['sport'] },
        why: 'the same kind of watch from the houses a collector moves up to' },
      { grade: 2, when: { brandIn: ['Patek Philippe', 'Audemars Piguet', 'Vacheron Constantin', 'A. Lange & Söhne',
                                    'F.P.Journe', 'Greubel Forsey'] },
        why: 'the step up in maison, not in category' },
      { grade: 1, when: { styleAny: ['sport'], priceMin: 20000 }, why: 'more expensive than what he owns, same tier of name' },
    ] },

  { id: 'f26', category: 'collector', query: 'hand-wound only, I like the ritual of winding it',
    must: { movementAny: ['manual'] },
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 40 }, why: 'the register hand-winding belongs to' },
      { grade: 2, when: {}, why: 'hand-wound, whatever else it is' },
    ] },

  { id: 'f27', category: 'collector', query: 'a tourbillon, I want to watch it turn',
    must: { functionsAny: ['tourbillon'] },
    rubric: [
      { grade: 3, when: { dialAny: ['openwork', 'skeleton'] }, why: 'the cage is visible from the front, which is the point' },
      { grade: 2, when: { caseBackAny: ['sapphire', 'transparent', 'see-through'] }, why: 'visible, from the back' },
      { grade: 1, when: {}, why: 'has one, hidden' },
    ] },

  { id: 'f28', category: 'collector', query: 'a chronograph I could actually use to time something',
    must: { functionsAny: ['chronograph'] },
    rubric: [
      { grade: 3, when: { waterResistanceMin: 100, materialNone: ['gold', 'platin'] },
        why: 'used rather than admired: legible, sealed, not precious' },
      { grade: 2, when: { waterResistanceMin: 50 }, why: 'usable, less robust' },
      { grade: 1, when: {}, why: 'a chronograph, built for the case rather than the stopwatch' },
    ] },

  { id: 'f29', category: 'collector', query: 'limited production, not something everyone has',
    must: {},
    rubric: [
      { grade: 3, when: { brandIn: ['F.P.Journe', 'Greubel Forsey'] }, why: 'the two houses here that make watches in tens' },
      { grade: 2, when: { styleAny: ['art'] }, why: 'made in small numbers because of how it is decorated' },
      { grade: 1, when: { materialAny: ['platin'] }, why: 'uncommon by metal rather than by production' },
    ] },

  { id: 'f30', category: 'collector', query: 'enamel or engraving, the old crafts',
    must: {},
    rubric: [
      { grade: 3, when: { dialAny: ['enamel', 'engrav', 'guilloch', 'lacquer'] }, why: 'the craft is on the dial, done by hand' },
      { grade: 2, when: { styleAny: ['art'] }, why: 'an artistic piece whose decoration is elsewhere' },
      { grade: 1, when: { materialAny: ['gold', 'platin'] }, why: 'finished to a high standard, no craft on show' },
    ] },

  // -- Fit ---------------------------------------------------------------------
  { id: 'f31', category: 'fit', query: "I'm tall with wrists to match, most watches disappear on me",
    must: {},
    rubric: [
      { grade: 3, when: { diameterMin: 43 }, why: 'enough case to read as a watch on that wrist' },
      { grade: 2, when: { diameterMin: 41 }, why: 'holds its own without presence' },
      { grade: 1, when: { diameterMin: 40 }, why: 'the smallest that would not vanish' },
    ] },

  { id: 'f32', category: 'fit', query: 'anything over 40mm looks silly on me',
    must: { diameterMax: 40 },
    rubric: [
      { grade: 3, when: { diameterMax: 38 }, why: 'comfortably inside the line drawn' },
      { grade: 2, when: {}, why: 'at the limit stated' },
    ] },

  { id: 'f33', category: 'fit', query: 'I wear my shirt cuffs tight',
    must: {},
    rubric: [
      { grade: 3, when: { styleAny: ['dress'], diameterMax: 38, functionsNone: ['chronograph'] },
        why: 'a slim case with nothing projecting from the side' },
      { grade: 2, when: { diameterMax: 40, functionsNone: ['chronograph'] }, why: 'small enough, not built for a cuff' },
      { grade: 1, when: { diameterMax: 41 }, why: 'fits if the cuff gives' },
    ] },

  { id: 'f34', category: 'fit', query: 'heavy watches give me a sore wrist by the evening',
    must: {},
    rubric: [
      { grade: 3, when: { materialAny: ['titan', 'ceramic', 'carbon'], diameterMax: 42 }, why: 'light metal in a case that is not oversized' },
      { grade: 2, when: { diameterMax: 39 }, why: 'light because it is small' },
      { grade: 1, when: { diameterMax: 41 }, why: 'bearable through a day' },
    ] },

  { id: 'f35', category: 'fit', query: 'a bracelet, not a strap, I sweat through leather',
    must: { strapAny: ['bracelet', 'oyster', 'steel', 'titan'] },
    rubric: [
      { grade: 3, when: { waterResistanceMin: 100 }, why: 'metal bracelet on a case that can be rinsed' },
      { grade: 2, when: {}, why: 'on a bracelet, as asked' },
    ] },

  { id: 'f36', category: 'fit', query: 'my last watch overhung my wrist, I need a smaller case',
    must: {},
    rubric: [
      { grade: 3, when: { diameterMax: 38 }, why: 'a case that sits inside the wrist' },
      { grade: 2, when: { diameterMax: 40 }, why: 'fits, filling the wrist' },
      { grade: 1, when: { diameterMax: 41 }, why: 'borderline again' },
    ] },

  // -- Facet half, binary. Worded deliberately unlike the older dev queries -----
  // -- Brand and collection named directly -------------------------------------
  { id: 'fs01', category: 'brand_alias', query: 'a lange und sohne',
    truth: { brand: 'A. Lange & Söhne' } },

  { id: 'fs02', category: 'collection', query: 'royal oak',
    truth: { collection: 'Royal Oak' } },
  { id: 'fs03', category: 'collection', query: 'show me the reverso range',
    truth: { collection: 'Reverso' } },

  // Style words the dev set never pairs with these brands.
  { id: 'fs04', category: 'style', query: 'formal watches from Jaeger-LeCoultre',
    truth: { brand: 'Jaeger-LeCoultre', styleAny: ['dress'] } },
  { id: 'fs05', category: 'style', query: 'artistic collections with a decorated dial',
    truth: { styleAny: ['art'], dialAny: ['enamel', 'guilloch', 'engrav', 'lacquer', 'openwork'] } },

  // -- Size, stated three ways the dev set does not use -------------------------
  { id: 'fs06', category: 'size', query: 'no more than 37 mm across',
    truth: { diameterMax: 37 } },
  { id: 'fs07', category: 'size', query: 'forty-four millimetres and up',
    truth: { diameterMin: 44 } },
  { id: 'fs08', category: 'size', query: 'case between 36 and 38 millimetres',
    truth: { diameterMin: 36, diameterMax: 38 } },

  // -- Dial colours the dev set leaves alone ------------------------------------
  { id: 'fs09', category: 'dial', query: 'a silver coloured face',
    truth: { dialAny: ['silver'] } },
  { id: 'fs10', category: 'dial', query: 'something with a grey dial',
    truth: { dialAny: ['grey', 'gray', 'slate', 'anthracite'] } },
  { id: 'fs11', category: 'dial', query: 'salmon or champagne dials',
    truth: { dialAny: ['salmon', 'champagne'] } },

  // -- Case material ------------------------------------------------------------
  { id: 'fs12', category: 'material', query: 'cases made of platinum',
    truth: { materialAny: ['platin'] } },
  { id: 'fs13', category: 'material', query: 'anything in titanium or ceramic',
    truth: { materialAny: ['titan', 'ceramic'] } },
  { id: 'fs14', category: 'material', query: 'yellow gold pieces',
    truth: { materialAny: ['yellow gold'] } },

  // -- Movement, including the quartz case the dev set only reaches semantically --
  { id: 'fs15', category: 'movement', query: 'battery powered, i do not want to wind anything',
    truth: { movementAny: ['quartz'] } },
  // 228 of 338 watches are automatic, so the reserve is what makes this a label rather than a
  // synonym for the catalogue. Sixty hours still left 93; four days leaves 22.
  { id: 'fs16', category: 'movement', query: 'self winding, four days of reserve at least',
    truth: { movementAny: ['automatic'], powerReserveMin: 96 } },
  { id: 'fs17', category: 'movement', query: 'crown wound movements under 30 thousand',
    truth: { movementAny: ['manual'], priceMax: 30000 } },

  // -- Water resistance as a rating and as a use --------------------------------
  { id: 'fs18', category: 'water_resistance', query: 'rated to at least 150 metres',
    truth: { waterResistanceMin: 150 } },
  // 100 m alone clears about a quarter of the catalogue, so the strap is what makes this a label.
  { id: 'fs19', category: 'water_resistance', query: 'good for snorkelling, on a rubber strap',
    truth: { waterResistanceMin: 100, strapAny: ['rubber'] } },

  // -- Complications described by what they do ----------------------------------
  { id: 'fs20', category: 'complication', query: 'shows the day, date and month together',
    truth: { functionsAny: ['annual calendar', 'perpetual calendar'] } },
  { id: 'fs21', category: 'complication', query: 'a watch that chimes the hours',
    truth: { functionsAny: ['minute repeater', 'grande sonnerie'] } },

  // -- Budget, including a floor and a band -------------------------------------
  { id: 'fs22', category: 'budget', query: 'i can go up to 8 thousand, not a dollar more',
    truth: { priceMax: 8000 } },
  { id: 'fs23', category: 'budget', query: 'somewhere in the 60 to 90 thousand bracket',
    truth: { priceMin: 60000, priceMax: 90000 } },
  { id: 'fs24', category: 'budget', query: 'starting from 100 thousand upwards',
    truth: { priceMin: 100000 } },

  // -- Brand with a budget attached ---------------------------------------------
  { id: 'fs25', category: 'brand_budget', query: 'rolex, ceiling of 20 thousand',
    truth: { brand: 'Rolex', priceMax: 20000 } },
  { id: 'fs26', category: 'brand_budget', query: 'what does Grand Seiko have below 10k',
    truth: { brand: 'Grand Seiko', priceMax: 10000 } },
  { id: 'fs27', category: 'brand_budget', query: 'audemars piguet, 50k and over',
    truth: { brand: 'Audemars Piguet', priceMin: 50000 } },

  // -- Negation: four ways of saying "not that" ----------------------------------
  { id: 'fs28', category: 'exclusion', query: 'automatics under 25k, but skip anything from Omega',
    truth: { movementAny: ['automatic'], priceMax: 25000, excludeBrand: ['Omega'] } },
  { id: 'fs29', category: 'exclusion', query: 'steel, 40mm or under, and no date window',
    truth: { materialAny: ['steel'], diameterMax: 40, functionsNone: ['date'] } },
  { id: 'fs30', category: 'exclusion', query: 'leave out the divers, nothing over 38mm',
    truth: { styleNone: ['diver'], diameterMax: 38 } },
  // Phrased as a refusal, but what a right answer is is the two strap families left standing.
  { id: 'fs31', category: 'exclusion', query: 'no bracelets please, leather or rubber only, under 20k',
    truth: { strapAny: ['leather', 'alligator', 'calf', 'crocodile', 'rubber'], priceMax: 20000 } },

  // -- Conjunctions of three to five facets --------------------------------------
  { id: 'fs32', category: 'compound', query: 'silver dial, steel case, automatic, under 25 thousand',
    truth: { dialAny: ['silver', 'argent'], materialAny: ['steel'], movementAny: ['automatic'],
      priceMax: 25000 } },
  { id: 'fs33', category: 'compound', query: 'platinum dress watch with a moon phase',
    truth: { materialAny: ['platin'], styleAny: ['dress'], functionsAny: ['moon'] } },
  { id: 'fs34', category: 'compound', query: 'titanium sports watch rated past 100 metres',
    truth: { materialAny: ['titan'], styleAny: ['sport', 'diver'], waterResistanceMin: 100 } },
  { id: 'fs35', category: 'compound', query: 'slate dial on leather, wound by hand',
    truth: { dialAny: ['grey', 'gray', 'slate', 'anthracite'], movementAny: ['manual'],
      strapAny: ['leather', 'alligator', 'calf', 'crocodile'] } },
  { id: 'fs36', category: 'compound', query: 'gmt in steel on a bracelet, 42mm or less, under 35k',
    truth: { functionsAny: ['gmt', 'dual time', 'second time', 'world time'], materialAny: ['steel'],
      strapAny: ['bracelet', 'oyster'], diameterMax: 42, priceMax: 35000 } },

  // -- Eight more, weighted to the categories that discriminate most ------------
  { id: 'fs37', category: 'brand_alias', query: 'vacheron',
    truth: { brand: 'Vacheron Constantin' } },
  { id: 'fs38', category: 'collection', query: 'submariner',
    truth: { collection: 'Submariner' } },
  { id: 'fs39', category: 'style', query: 'Omega dress watches',
    truth: { brand: 'Omega', styleAny: ['dress'] } },
  { id: 'fs40', category: 'complication', query: 'a stopwatch function, in a gold case',
    truth: { functionsAny: ['chronograph'], materialAny: ['gold'] } },
  { id: 'fs41', category: 'exclusion', query: 'a dress watch under 30k, anything except Patek',
    truth: { excludeBrand: ['Patek Philippe'], styleAny: ['dress'], priceMax: 30000 } },
  { id: 'fs42', category: 'exclusion', query: 'not steel, nothing with a tourbillon, under 60 thousand',
    truth: { materialNone: ['steel'], functionsNone: ['tourbillon'], priceMax: 60000 } },
  { id: 'fs43', category: 'compound', query: 'blue dial, titanium case, automatic, 100m or better',
    truth: { dialAny: ['blue'], materialAny: ['titan'], movementAny: ['automatic'], waterResistanceMin: 100 } },
  { id: 'fs44', category: 'compound', query: 'rose gold chronograph on leather',
    truth: { materialAny: ['rose gold', 'pink gold'], functionsAny: ['chronograph'],
      strapAny: ['leather', 'alligator', 'calf', 'crocodile'] } },
];
