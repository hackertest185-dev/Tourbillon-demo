# Procedural watch previews

Every customer watch card and the product hero now use `Watch3D`.
The four named reference models have explicit presets. Every other catalogue
watch gets a deterministic configuration from its existing case, dial and
strap specifications. Missing specifications use neutral defaults.
A neutral loading indicator appears until the first 3D frame is ready. Each
visible watch completes an eight-second 360-degree turn, crossfades to its real
product photograph for three seconds, then repeats. The photograph is preloaded
near the viewport and stays hidden during initial loading and the first turn.
No database changes, external models or new dependencies are required.

## Files and architecture

- `frontend/components/watch3d/Watch3D.tsx`: loading indicator, photo preloading,
  crossfade, failure fallback, lazy import, visibility observers and reduced motion.
- `config.ts`: presets plus inference for all other watches.
- `buildWatch.ts`: procedural case, dial/bezel textures, applied indices,
  hands, curved straps, instanced bracelet links and disposal.
- `runtime.ts`: one shared WebGL renderer, one animation loop, generated
  RoomEnvironment/PMREM lighting, model pooling and lifecycle diagnostics.
- `settings.ts`: eight-second rotation, three-second photo hold, tilt, frame cap, DPR and preload settings.
- `presentation.ts`: deterministic turn/photo timing and late-image handling.
- `Watch3D.module.css`: reserved image area, visible-only loading animation and 3D fade-in.
- Existing card, comparison, chat, homepage, staff pick and detail components
  supply their watch and original image to the shared viewer.

The renderer uses an offscreen WebGL canvas, renders each visible scene and
copies it synchronously into that card's transparent 2D canvas. This preserves
the existing rounded containers, card transforms, overlays and scrolling;
a page-wide scissor canvas would need to duplicate those CSS transforms and clips.
There is exactly one WebGL context for all customer card instances.

Three.js is imported only when a card enters the 180 px preload margin.
Scene construction runs during idle time. Offscreen cards stop rendering;
models outside the margin release geometry, material, instancing and texture
resources. Identical visible configurations share model resources. When no
cards remain, the renderer and environment are disposed after a short idle delay.
Hidden tabs stop the animation loop. Rendering is capped at 60 fps, reduced to
30 fps on modest devices or when more than four cards are visible. DPR is at
most 2 (1.5 on modest devices). There are no shadow maps or external HDR files.
The shared visible-time clock controls both stages. WebGL drawing is skipped
during the photograph hold. Hover, pointer press, dragging and arrow keys do
not pause or control the viewer. Parent product links still open details.
Reduced motion keeps a static model. A missing/failed photo leaves automatic
3D turns running; missing WebGL shows the photograph instead.

## Real product photographs

All 12 catalogue assets were downloaded again from the manufacturer image URLs
recorded in `data/catalogue.json`. The actual models are used, not AI images or
lookalike watches. PNG originals were encoded as lossless WebP at their original
dimensions, preserving alpha. Pixel checks confirm all visible RGB values and
alpha values match the downloaded originals; RGB values behind fully transparent
pixels may be cleared by WebP encoding.

- Tissot: 1680 × 1680, four models.
- Grand Seiko: 1102 × 1102, four models.
- Seiko: 1114–1224 × 1918–1968, four models.

The UI requests responsive, retina-sized Next.js images at quality 95. A source
revision in the photo URL bypasses previously cached conversions of the older
lossy files. Original files are larger (about 10.3 MB total); only near-viewport
photos are mounted, and responsive images avoid sending every original in full
to a phone. There is no enlargement of the source assets or blur filter.

Source product pages: [Tissot PRX](https://www.tissotwatches.com/en-us/T1374101104100.html),
[Grand Seiko SBGW301](https://www.grand-seiko.com/us-en/collections/SBGW301G),
[Seiko SRPE93](https://seikousa.com/products/srpe93). The full per-model source
and image URL inventory remains in the catalogue manifest.

## Add or refine a watch

New catalogue watches work automatically from their existing specifications.
For a more specific design, add one entry to `WATCH_CONFIGS` in `config.ts`.
The entry key must be a lowercase alphanumeric model reference contained in
the watch name or slug, with spaces and punctuation removed.

```ts
newreference123: {
  caseSize: 40, caseShape: 'round', caseColor: '#c4cbd1',
  dialColor: '#123d69', dialType: 'sunburst', markers: 'baton',
  strapType: 'leather', strapColor: '#49241b',
  datePosition: 3, crownHour: 3, gmt: false, domed: true,
},
```

Optional `bezelColor` adds a diver bezel; `dayDate` adds the combined window.
Date position is 0 (none), 3 or 6. Strap types are steel, leather and silicone.

## Honest visual limits

These are illustrative models, not manufacturer CAD or product photography.
Real brand logos and dial signatures are omitted. Dial text is neutral.
The four presets approximate the specified proportions and colours; inferred
models are less specific. The casebacks, clasp, crown knurling, lume,
leather grain and bracelet construction are simplified. Complex complications,
individual movement mechanisms, exact proprietary case shapes and manufacturer
finishes are not reproduced. The date is a fixed display and the hands start
at 10:10:30; the seconds hand sweeps while animation is enabled.

## Validation

Tested in Chromium/Edge at 360, 768 and 1280 px, including generic models:
no horizontal overflow; reduced motion is static; vertical touch scrolling
remains available. Hover and held pointer input do not pause automatic
rotation; a hidden tab stops rendering. Disabled WebGL and context loss return
to the original poster. Three repeated scroll cycles showed stable GPU resource
counts at the same positions, with resources released when all cards leave
the preload range. This is browser emulation, not a guarantee of frame rate on
every physical phone.

Build and lint checks pass. The repository has existing image-optimisation
warnings in admin and scraping components, outside this change.

The renderer stays in lazy chunks rather than the initial Watches page payload.
The shared initial JS remains 102 kB; the current Watches page first-load JS is
about 254 kB after the storefront localization and automatic-photo update.
The cold 3D payload is downloaded only when a watch approaches the viewport,
and may already be cached if another 3D feature loaded Three.js first.

The automatic photo cycle also has explicit boundary checks: photo begins after
the full turn, holds until 11 seconds of visible time, then starts the next turn.
Late/missing images skip a photo slot instead of exposing a blank area.
Browser checks at 390 px (DPR 2) and 1280 px requested quality-95 images at
828 px and 640 px respectively. Both exceed the displayed image's retina needs.
The measured photo holds were 3000 ms and 2999 ms with a pointer held over the
viewer. Reduced motion, failed-photo continuation, no-WebGL photo fallback and
clicking a photo to open product details also pass without browser exceptions.
