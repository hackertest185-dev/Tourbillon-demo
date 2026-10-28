// Imported only after a card nears the viewport. No Three.js code is in Watch3D's entry chunk.
import { ACESFilmicToneMapping, DirectionalLight, InstancedMesh, OrthographicCamera, PMREMGenerator, Scene, SRGBColorSpace, WebGLRenderer, type Group, type WebGLRenderTarget } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWatch, disposeWatch } from './buildWatch';
import { FPS_CAP, MAX_DPR, TILT_DEG, type WatchControls } from './settings';
import { advancePresentation } from './presentation';
import type { WatchConfig } from './config';

type SharedModel = { template: Group; references: number };
type Client = {
  scene: Scene; camera: OrthographicCamera; model: Group; seconds?: Group;
  canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; controls: WatchControls;
  active: boolean; dirty: boolean; ready: boolean; width: number; height: number;
  lastDraw: number; elapsed: number; cycleElapsed: number; showPhoto: boolean;
  onReady: () => void; onFailure: () => void; onPhotoChange: (show: boolean) => void; key: string;
};
const models = new Map<string, SharedModel>();
const clients = new Set<Client>();
let renderer: WebGLRenderer | null = null;
let environment: WebGLRenderTarget | null = null;
let animation = 0, previous = 0, renders = 0;
let unavailable = false;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let mobileLow = false;
let lostHandler: ((event: Event) => void) | undefined;
let visibilityHandler: (() => void) | undefined;

function stop() { if (animation) cancelAnimationFrame(animation); animation = 0; previous = 0; }
function fail() {
  unavailable = true; stop();
  [...clients].forEach(client => { client.active = false; client.onFailure(); });
}
function destroy() {
  stop();
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
  if (renderer && lostHandler) renderer.domElement.removeEventListener('webglcontextlost', lostHandler);
  environment?.dispose(); environment = null;
  const context = renderer?.getContext();
  renderer?.dispose();
  if (context && !context.isContextLost()) context.getExtension('WEBGL_lose_context')?.loseContext();
  renderer = null;
  visibilityHandler = undefined; lostHandler = undefined;
}
function ensureRenderer() {
  if (renderer) return renderer;
  if (unavailable) return null;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'low-power' });
    if (!context) { unavailable = true; return null; }
    renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
    renderer.debug.checkShaderErrors = false;
    renderer.shadowMap.enabled = false;
    const room = new RoomEnvironment(), pmrem = new PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, .04);
    room.dispose(); pmrem.dispose();
    const device = navigator as Navigator & { deviceMemory?: number };
    mobileLow = (device.hardwareConcurrency || 8) <= 4 || (device.deviceMemory || 8) <= 4;
    lostHandler = event => { event.preventDefault(); fail(); };
    canvas.addEventListener('webglcontextlost', lostHandler);
    visibilityHandler = () => { if (document.hidden) stop(); else { clients.forEach(client => { client.dirty = true; }); wake(); } };
    document.addEventListener('visibilitychange', visibilityHandler);
    return renderer;
  } catch { unavailable = true; destroy(); return null; }
}
function wake() {
  if (!animation && !document.hidden && [...clients].some(client => client.active)) animation = requestAnimationFrame(frame);
}
function frame(now: number) {
  animation = 0;
  if (!renderer || document.hidden) { previous = 0; return; }
  const delta = previous ? Math.min(now - previous, 100) : 0;
  previous = now;
  const active = [...clients].filter(client => client.active);
  const fps = Math.min(FPS_CAP, mobileLow || active.length > 4 ? 30 : 60);
  try {
    for (const client of active) {
      const state = client.controls;
      if (!state.reduced) {
        const presentation = advancePresentation(client.cycleElapsed, delta, state.photoReady);
        client.cycleElapsed = presentation.elapsed;
        state.rotation = state.initialRotation + presentation.progress * Math.PI * 2;
        client.elapsed += delta;
      }
      const showPhoto = !state.reduced && advancePresentation(client.cycleElapsed, 0, state.photoReady).showPhoto;
      if (showPhoto !== client.showPhoto) {
        client.showPhoto = showPhoto;
        client.dirty = true;
        client.onPhotoChange(showPhoto);
      }
      if (now - client.lastDraw < 1000 / fps || (state.reduced && !client.dirty)) continue;
      // Keep the last frame for the crossfade; the three photo seconds require
      // no WebGL drawing. The shared clock still advances to the next turn.
      if (showPhoto && !client.dirty) continue;
      client.model.rotation.set(-TILT_DEG * Math.PI / 180, state.rotation, 0);
      if (client.seconds) client.seconds.rotation.z = -Math.PI - client.elapsed / 60000 * Math.PI * 2;
      const dpr = Math.min(window.devicePixelRatio || 1, mobileLow ? 1.5 : MAX_DPR);
      const width = Math.max(1, Math.min(1000, Math.round(client.width * dpr)));
      const height = Math.max(1, Math.min(1000, Math.round(client.height * dpr)));
      if (client.canvas.width !== width || client.canvas.height !== height) { client.canvas.width = width; client.canvas.height = height; }
      const aspect = width / height, view = Math.max(6.2, 3.4 / aspect);
      client.camera.left = -view * aspect / 2; client.camera.right = view * aspect / 2;
      client.camera.top = view / 2; client.camera.bottom = -view / 2; client.camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(client.scene, client.camera);
      client.context.clearRect(0, 0, width, height);
      client.context.drawImage(renderer.domElement, 0, 0, width, height);
      client.lastDraw = now; client.dirty = false; renders++;
      if (!client.ready) { client.ready = true; client.onReady(); }
    }
  } catch { fail(); return; }
  if (active.some(client => !client.controls.reduced || client.dirty)) animation = requestAnimationFrame(frame);
  else previous = 0;
}
export function mountWatch(canvas: HTMLCanvasElement, config: WatchConfig, controls: WatchControls, onReady: () => void, onFailure: () => void, onPhotoChange: (show: boolean) => void) {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = undefined; }
  const shared = ensureRenderer(), context = canvas.getContext('2d', { alpha: true });
  if (!shared || !context) { onFailure(); return null; }
  const key = JSON.stringify(config);
  let pooled = models.get(key);
  let acquired = false;
  try {
    if (!pooled) { pooled = { template: buildWatch(config), references: 0 }; models.set(key, pooled); }
    pooled.references++;
    acquired = true;
    const model = pooled.template.clone(true);
    const scene = new Scene();
    scene.environment = environment!.texture; scene.environmentIntensity = .7;
    const light = new DirectionalLight('#fff3dc', 2.2); light.position.set(-3, 4, 6);
    const rim = new DirectionalLight('#b5d7ff', 1.4); rim.position.set(4, 1, -3);
    scene.add(model, light, rim);
    const camera = new OrthographicCamera(-3, 3, 3, -3, .1, 30); camera.position.z = 9;
    const client: Client = { scene, camera, model, seconds: model.getObjectByName('seconds') as Group | undefined, canvas, context, controls, active: false, dirty: true, ready: false, width: 1, height: 1, lastDraw: 0, elapsed: 0, cycleElapsed: 0, showPhoto: false, onReady, onFailure, onPhotoChange, key };
    clients.add(client);
    return {
      resize(width: number, height: number) { client.width = width; client.height = height; client.dirty = true; wake(); },
      setActive(active: boolean) { client.active = active; client.dirty = true; wake(); },
      invalidate() { client.dirty = true; wake(); },
      dispose() {
        if (!clients.delete(client)) return;
        model.traverse(object => { if (object instanceof InstancedMesh) object.dispose(); });
        scene.clear();
        const entry = models.get(key);
        if (entry && --entry.references === 0) { disposeWatch(entry.template); models.delete(key); }
        if (!clients.size) { stop(); idleTimer = setTimeout(destroy, 1000); }
      },
    };
  } catch {
    onFailure();
    if (pooled && acquired) pooled.references--;
    if (pooled && pooled.references === 0) { disposeWatch(pooled.template); models.delete(key); }
    return null;
  }
}
// Useful for local profiling; nothing is attached to window in production.
export function getWatch3DStats() {
  return { contexts: renderer ? 1 : 0, near: clients.size, active: [...clients].filter(client => client.active && !document.hidden).length, models: models.size, renders, geometries: renderer?.info.memory.geometries ?? 0, textures: renderer?.info.memory.textures ?? 0, rotations: [...clients].filter(client => client.active).map(client => client.controls.rotation), presentations: [...clients].filter(client => client.active).map(client => client.showPhoto ? 'photo' : 'model') };
}
