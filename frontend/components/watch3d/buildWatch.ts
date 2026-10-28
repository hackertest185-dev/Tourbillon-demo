import {
  BoxGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry,
  DoubleSide, ExtrudeGeometry, Group, InstancedMesh, LatheGeometry, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, Object3D, RingGeometry,
  Path, Shape, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector2,
  CatmullRomCurve3, Vector3, RepeatWrapping, type Material, type Texture,
} from 'three';
import type { WatchConfig } from './config';

const TAU = Math.PI * 2;
function texture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  draw(ctx, size);
  const result = new CanvasTexture(canvas);
  result.colorSpace = SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}
function roundedShape(w: number, h: number, r: number) {
  const s = new Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function dialTexture(config: WatchConfig) {
  return texture(1024, (ctx, size) => {
    const c = size / 2, r = size * .49;
    const base = new Color(config.dialColor);
    const light = base.clone().lerp(new Color('#ffffff'), .14).getStyle();
    const dark = base.clone().multiplyScalar(.35).getStyle();
    const gradient = ctx.createRadialGradient(c * .8, c * .7, 10, c, c, r);
    gradient.addColorStop(0, light); gradient.addColorStop(.55, config.dialColor); gradient.addColorStop(1, dark);
    ctx.fillStyle = config.dialType === 'plain' ? config.dialColor : gradient;
    ctx.fillRect(0, 0, size, size);
    if (config.dialType !== 'plain') {
      for (let i = 0; i < 360; i++) {
        const a = i / 360 * TAU;
        ctx.strokeStyle = i % 3 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.09)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(c + Math.sin(a) * 80, c + Math.cos(a) * 80);
        ctx.lineTo(c + Math.sin(a) * r, c + Math.cos(a) * r); ctx.stroke();
      }
    }
    const ivory = /e6d7b4|ece9de|c1c8c9/.test(config.dialColor);
    const ink = ivory ? '#3e4549' : '#d4d4c3';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * TAU;
      ctx.strokeStyle = ink; ctx.lineWidth = i % 5 === 0 ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(c + Math.sin(a) * r * .91, c - Math.cos(a) * r * .91);
      ctx.lineTo(c + Math.sin(a) * r * (i % 5 === 0 ? .86 : .88), c - Math.cos(a) * r * (i % 5 === 0 ? .86 : .88)); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.fillStyle = ink;
    ctx.font = '500 18px sans-serif';
    ctx.fillText('AUTOMATIC', c, c + 137);
    if (config.dialType === 'diver') { ctx.font = '16px sans-serif'; ctx.fillText('200M', c, c + 169); }
    // A neutral geometric mark replaces any real brand logo.
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c - 13, c - 150); ctx.lineTo(c, c - 166); ctx.lineTo(c + 13, c - 150); ctx.stroke();
    if (config.gmt) {
      ctx.font = '16px sans-serif';
      for (let i = 2; i <= 24; i += 2) {
        const a = i / 24 * TAU;
        ctx.fillText(String(i), c + Math.sin(a) * r * .59, c - Math.cos(a) * r * .59 + 6);
      }
    }
    if (config.datePosition) {
      const x = config.datePosition === 3 ? c + 287 : c;
      const y = config.datePosition === 6 ? c + 288 : c;
      const w = config.dayDate ? 128 : 65;
      ctx.fillStyle = '#b7b9b0'; ctx.fillRect(x - w / 2 - 5, y - 25, w + 10, 50);
      ctx.fillStyle = '#eeeae0'; ctx.fillRect(x - w / 2, y - 20, w, 40);
      ctx.font = '500 27px sans-serif'; ctx.fillStyle = '#232527';
      ctx.fillText(config.dayDate ? 'WED  21' : '21', x, y + 10);
    }
  });
}
function bezelTexture(config: WatchConfig) {
  return texture(1024, (ctx, size) => {
    const c = size / 2, r = size * .46;
    ctx.fillStyle = config.bezelColor || '#161b1e'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#e3e4dc'; ctx.fillStyle = '#e3e4dc'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '500 34px sans-serif';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * TAU;
      if (i && i % 10 === 0) {
        ctx.save(); ctx.translate(c + Math.sin(a) * r * .88, c - Math.cos(a) * r * .88); ctx.rotate(a);
        ctx.fillText(String(i), 0, 0); ctx.restore();
      } else if (i) {
        ctx.lineWidth = i % 5 ? 2 : 5;
        ctx.beginPath(); ctx.moveTo(c + Math.sin(a) * r * .88, c - Math.cos(a) * r * .88);
        ctx.lineTo(c + Math.sin(a) * r * .97, c - Math.cos(a) * r * .97); ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.moveTo(c - 18, c - r * .95); ctx.lineTo(c + 18, c - r * .95); ctx.lineTo(c, c - r * .84); ctx.closePath(); ctx.fill();
  });
}
function leatherTexture() {
  return texture(512, (ctx, size) => {
    ctx.fillStyle = '#adadad'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#383838'; ctx.lineWidth = 7;
    for (let y = -1; y < 8; y++) for (let x = -1; x < 5; x++) {
      const offset = y % 2 ? 55 : 0;
      const left = x * 112 + offset, top = y * 74;
      ctx.beginPath(); ctx.roundRect(left + 5, top + 5, 103, 65, 13); ctx.stroke();
      ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(left + 17, top + 18); ctx.lineTo(left + 83, top + 18); ctx.stroke();
      ctx.strokeStyle = '#383838'; ctx.lineWidth = 7;
    }
  });
}
function hand(length: number, width: number, material: Material, lume: Material, pointed = true) {
  const group = new Group();
  const shape = new Shape();
  shape.moveTo(-width * .35, -.15); shape.lineTo(-width / 2, length * .7);
  shape.lineTo(pointed ? 0 : width / 2, length); shape.lineTo(width / 2, length * .7); shape.lineTo(width * .35, -.15); shape.closePath();
  const body = new Mesh(new ExtrudeGeometry(shape, { depth: .015, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 1 }), material);
  group.add(body);
  const inset = new Mesh(new BoxGeometry(width * .32, length * .49, .005), lume);
  inset.position.set(0, length * .47, .023); group.add(inset);
  return group;
}

/** A front-facing, brand-neutral product model. All parts are generated in code. */
export function buildWatch(config: WatchConfig): Group {
  const watch = new Group();
  const steel = new MeshStandardMaterial({ color: config.caseColor, metalness: 1, roughness: .23 });
  const brushed = new MeshStandardMaterial({ color: config.caseColor, metalness: .96, roughness: .38 });
  const dark = new MeshStandardMaterial({ color: '#1e2528', metalness: .8, roughness: .32 });
  const lume = new MeshStandardMaterial({ color: '#d5e6c9', metalness: .12, roughness: .5, emissive: '#728c65', emissiveIntensity: .09 });
  const add = (mesh: Mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); watch.add(mesh); return mesh; };
  const depth = config.dialType === 'diver' ? .31 : .23;
  if (config.caseShape === 'cushion') {
    const cushion = roundedShape(2.1, 1.95, .72);
    cushion.holes.push(new Path().absarc(0, 0, .84, 0, TAU, true));
    add(new Mesh(new ExtrudeGeometry(cushion, { depth, bevelEnabled: true, bevelSegments: 3, bevelSize: .04, bevelThickness: .025, steps: 1 }), steel), 0, 0, -depth / 2);
  } else {
    const profile = [new Vector2(.91, -depth / 2), new Vector2(.97, -depth / 2), new Vector2(1.01, -.07), new Vector2(1.01, .04), new Vector2(.97, depth / 2), new Vector2(.88, depth / 2)];
    const caseMesh = add(new Mesh(new LatheGeometry(profile, 64), steel));
    caseMesh.rotation.x = Math.PI / 2;
  }
  const back = add(new Mesh(new CylinderGeometry(.86, .88, .04, 48), brushed), 0, 0, -depth / 2 - .015);
  back.rotation.x = Math.PI / 2;
  [ .74, .8 ].forEach(radius => add(new Mesh(new TorusGeometry(radius, .008, 6, 48), steel), 0, 0, -depth / 2 - .04));
  const lugGeometry = new ExtrudeGeometry(roundedShape(.19, .4, .055), { depth: .13, bevelEnabled: true, bevelSize: .025, bevelThickness: .02, bevelSegments: 2 });
  for (const sign of [-1, 1]) for (const side of [-1, 1]) {
    const lug = add(new Mesh(lugGeometry, steel), side * .48, sign * .96, -.11);
    lug.rotation.x = sign * -.18;
  }
  const ring = add(new Mesh(new TorusGeometry(config.bezelColor ? .94 : .89, config.bezelColor ? .075 : .045, 10, 64), steel), 0, 0, depth / 2);
  ring.scale.z = .6;
  if (config.bezelColor) {
    add(new Mesh(new RingGeometry(.84, .995, 64), new MeshStandardMaterial({ map: bezelTexture(config), metalness: .15, roughness: .4, envMapIntensity: .3 })), 0, 0, depth / 2 + .045);
    add(new Mesh(new SphereGeometry(.018, 10, 6), lume), 0, .916, depth / 2 + .055);
    const knurl = new InstancedMesh(new BoxGeometry(.025, .04, .055), brushed, 80), dummy = new Object3D();
    for (let i = 0; i < 80; i++) { const a = i / 80 * TAU; dummy.position.set(Math.sin(a) * .992, Math.cos(a) * .992, depth / 2); dummy.rotation.z = -a; dummy.updateMatrix(); knurl.setMatrixAt(i, dummy.matrix); }
    watch.add(knurl);
  }
  const faceZ = depth / 2 + (config.bezelColor ? .012 : .02);
  add(new Mesh(new CircleGeometry(.855, 64), new MeshStandardMaterial({ map: dialTexture(config), metalness: .07, roughness: .65, envMapIntensity: .2 })), 0, 0, faceZ);
  const markers = new InstancedMesh(config.markers === 'lume' ? new CylinderGeometry(.045, .045, .025, 16).rotateX(Math.PI / 2) : new BoxGeometry(.025, .14, .025), steel, 12);
  const insets = new InstancedMesh(config.markers === 'lume' ? new CylinderGeometry(.035, .035, .006, 14).rotateX(Math.PI / 2) : new BoxGeometry(.009, .1, .006), lume, 12);
  const dummy = new Object3D();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const skip = (config.datePosition === 3 && i === 3) || (config.datePosition === 6 && i === 6);
    dummy.position.set(Math.sin(a) * .695, Math.cos(a) * .695, faceZ + .022);
    dummy.rotation.set(0, 0, -a); dummy.scale.setScalar(skip ? 0 : 1); dummy.updateMatrix(); markers.setMatrixAt(i, dummy.matrix);
    dummy.position.z += .017; dummy.updateMatrix(); insets.setMatrixAt(i, dummy.matrix);
  }
  watch.add(markers, insets);
  if (config.gmt) {
    const gmt = hand(.63, .055, new MeshStandardMaterial({ color: '#1563ba', metalness: .65, roughness: .2 }), lume);
    gmt.rotation.z = -10.17 / 24 * TAU; gmt.position.z = faceZ + .06; watch.add(gmt);
  }
  const hours = hand(.46, config.markers === 'lume' ? .09 : .045, steel, lume);
  hours.rotation.z = -(10 + 10 / 60) / 12 * TAU; hours.position.z = faceZ + .095; watch.add(hours);
  const minutes = hand(.64, config.markers === 'lume' ? .065 : .03, steel, lume);
  minutes.rotation.z = -10.5 / 60 * TAU; minutes.position.z = faceZ + .13; watch.add(minutes);
  const seconds = new Group(); seconds.name = 'seconds';
  const needle = new Mesh(new BoxGeometry(.009, .86, .008), config.gmt ? dark : steel);
  needle.position.y = .22; seconds.add(needle);
  const counter = new Mesh(new TorusGeometry(.037, .007, 6, 14), steel); counter.position.y = -.17; seconds.add(counter);
  seconds.position.z = faceZ + .16; seconds.rotation.z = -Math.PI; watch.add(seconds);
  add(new Mesh(new SphereGeometry(.035, 14, 8), steel), 0, 0, faceZ + .18).scale.z = .4;
  const glass = new MeshPhysicalMaterial({ color: '#d4e8fa', transparent: true, opacity: .018, roughness: .14, metalness: 0, clearcoat: .6, specularIntensity: .15, envMapIntensity: .1, depthWrite: false, side: DoubleSide });
  const crystal = add(new Mesh(new SphereGeometry(.847, 48, 12, 0, TAU, 0, Math.PI / 2).scale(1, config.domed ? .1 : .025, 1).rotateX(Math.PI / 2), glass), 0, 0, faceZ + .19);
  crystal.renderOrder = 2;
  const crown = new Group(), crownAngle = config.crownHour / 12 * TAU;
  crown.position.set(Math.sin(crownAngle) * 1.075, Math.cos(crownAngle) * 1.075, -.015);
  crown.rotation.z = -crownAngle;
  crown.add(new Mesh(new CylinderGeometry(.12, .12, .21, 24), steel));
  const grooves = new InstancedMesh(new BoxGeometry(.018, .19, .016), brushed, 20);
  for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; dummy.position.set(Math.sin(a) * .118, 0, Math.cos(a) * .118); dummy.rotation.set(0, a, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); grooves.setMatrixAt(i, dummy.matrix); }
  crown.add(grooves); watch.add(crown);
  buildStrap(watch, config, steel, brushed);
  watch.scale.setScalar(config.caseSize / 42);
  return watch;
}
function buildStrap(watch: Group, config: WatchConfig, steel: Material, brushed: Material) {
  const dummy = new Object3D();
  const point = (sign: number, t: number, x = 0) => new Vector3(x, sign * (1.01 + t * 1.5), -.05 - t * t * .88);
  if (config.strapType === 'steel') {
    const geometry = new ExtrudeGeometry(roundedShape(.245, .16, .025), { depth: .07, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 1 });
    const outer = new InstancedMesh(geometry, brushed, 48), inner = new InstancedMesh(geometry, steel, 24);
    let outside = 0, inside = 0;
    for (const sign of [-1, 1]) for (let i = 0; i < 12; i++) for (let col = -1; col <= 1; col++) {
      const t = (i + .5) / 12; dummy.position.copy(point(sign, t, col * .25));
      dummy.rotation.set(-sign * Math.atan(t * 1.17), 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      if (col === 0) inner.setMatrixAt(inside++, dummy.matrix); else outer.setMatrixAt(outside++, dummy.matrix);
    }
    watch.add(outer, inner);
    const clasp = new Mesh(new BoxGeometry(.62, .38, .08), brushed);
    clasp.position.copy(point(-1, .95)); clasp.rotation.x = .75; watch.add(clasp);
    return;
  }
  const grain = config.strapType === 'leather' ? leatherTexture() : undefined;
  if (grain) { grain.wrapS = grain.wrapT = RepeatWrapping; grain.repeat.set(1, 2.3); }
  const strap = new MeshStandardMaterial({ color: config.strapColor, roughness: config.strapType === 'leather' ? .55 : .83, metalness: 0, bumpMap: grain ?? null, bumpScale: .012 });
  const stitches = new MeshStandardMaterial({ color: '#a58b6c', roughness: .9 });
  for (const sign of [-1, 1]) {
    const path = new CatmullRomCurve3([point(sign, 0), point(sign, .3), point(sign, .65), point(sign, 1)]);
    // Extrusion follows the curved band rather than making a flat cardboard strap.
    const shape = roundedShape(.72, .075, .02);
    watch.add(new Mesh(new ExtrudeGeometry(shape, { steps: 20, bevelEnabled: false, extrudePath: path }), strap));
    const detail = new InstancedMesh(new BoxGeometry(config.strapType === 'leather' ? .012 : .68, .025, config.strapType === 'leather' ? .012 : .035), config.strapType === 'leather' ? stitches : strap, config.strapType === 'leather' ? 48 : 10);
    if (config.strapType === 'leather') {
      for (let i = 0; i < 24; i++) for (let side = 0; side < 2; side++) {
        dummy.position.copy(point(sign, i / 25, side ? .315 : -.315)); dummy.position.z += .045;
        dummy.rotation.set(-sign * Math.atan(i / 25 * 1.17), 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); detail.setMatrixAt(i * 2 + side, dummy.matrix);
      }
    } else {
      for (let i = 0; i < 10; i++) {
        dummy.position.copy(point(sign, .04 + i * .035)); dummy.position.z += .048; dummy.rotation.set(-sign * i * .035, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); detail.setMatrixAt(i, dummy.matrix);
      }
    }
    watch.add(detail);
  }
  const buckle = new Mesh(new TorusGeometry(.23, .035, 6, 24), steel);
  buckle.scale.set(1.45, .65, 1); buckle.position.copy(point(1, .99)); buckle.rotation.x = -.7; watch.add(buckle);
}

export function disposeWatch(group: Group) {
  const geometries = new Set<{ dispose: () => void }>(), materials = new Set<Material>(), textures = new Set<Texture>();
  group.traverse(object => {
    const mesh = object as Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => {
      materials.add(material);
      Object.values(material).forEach(value => { if (value && typeof value === 'object' && 'isTexture' in value) textures.add(value as Texture); });
    });
    if (object instanceof InstancedMesh) object.dispose();
  });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
}
