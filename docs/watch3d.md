# Procedural watch previews

Every customer watch card and the product hero now use `Watch3D`.
The four named reference models have explicit presets. Every other catalogue
watch gets a deterministic configuration from its existing case, dial and
strap specifications. Missing specifications use neutral defaults.
No database changes, new image downloads, external models, or new dependencies
are required. Existing image files and API image values remain the fallback.

## Files and architecture

- `frontend/components/watch3d/Watch3D.tsx`: lightweight poster, lazy import,
  visibility observers, pointer/keyboard interaction and reduced motion.
- `config.ts`: presets plus inference for all other watches.
- `buildWatch.ts`: procedural case, dial/bezel textures, applied indices,
  hands, curved straps, instanced bracelet links and disposal.
- `runtime.ts`: one shared WebGL renderer, one animation loop, generated
  RoomEnvironment/PMREM lighting, model pooling and lifecycle diagnostics.
- `settings.ts`: rotation speed, tilt, frame cap, DPR, input and preload settings.
- `Watch3D.module.css`: reserved image area and poster crossfade.
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
no horizontal overflow; reduced motion is static; keyboard and pointer rotation
work; vertical touch scrolling remains available. Hover pauses automatic
rotation; a hidden tab stops rendering. Disabled WebGL and context loss return
to the original poster. Three repeated scroll cycles showed stable GPU resource
counts at the same positions, with resources released when all cards leave
the preload range. This is browser emulation, not a guarantee of frame rate on
every physical phone.

Build and lint checks pass. The repository has existing image-optimisation
warnings in admin and scraping components, outside this change.

The final production build splits the renderer into three lazy chunks totalling
771,092 bytes (195,074 bytes gzipped, about 190.5 KiB). None appears in the
initial Watches page chunk list. The shared initial JS remains 102 kB; the
Watches page first-load JS is about 252 kB versus about 249 kB before this feature.
The cold 3D payload is downloaded only when a watch approaches the viewport,
and may already be cached if another 3D feature loaded Three.js first.
