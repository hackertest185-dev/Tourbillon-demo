'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { configForWatch, type WatchVisualSource } from './config';
import { DRAG_SENSITIVITY, PRELOAD_MARGIN, RESUME_DELAY_MS, type WatchControls } from './settings';
import type { mountWatch } from './runtime';
import styles from './Watch3D.module.css';

type Handle = NonNullable<ReturnType<typeof mountWatch>>;
export default function Watch3D({ watch, fallbackSrc, alt, index, priority = false }: {
  watch: WatchVisualSource; fallbackSrc?: string | null; alt: string; index: number; priority?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<Handle | null>(null);
  const controls = useRef<WatchControls>({ rotation: (index % 8) * .13 - .35, velocity: 0, dragging: false, hovered: false, reduced: false, resumeAt: 0 });
  const pointer = useRef<{ id: number; x: number; startX: number; startY: number; last: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [near, setNear] = useState(false), [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [posterError, setPosterError] = useState(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const { id, name, slug, specs } = watch;
  const config = useMemo(() => configForWatch({ id, name, slug, specs }), [id, name, slug, specs]);
  useEffect(() => { setFailed(false); setReady(false); }, [config]);
  useEffect(() => { setPosterError(false); }, [fallbackSrc]);
  useEffect(() => { controls.current.rotation = (index % 8) * .13 - .35; handle.current?.invalidate(); }, [index]);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const preload = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: PRELOAD_MARGIN });
    const visibility = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    preload.observe(node); visibility.observe(node);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { controls.current.reduced = media.matches; controls.current.velocity = 0; handle.current?.invalidate(); };
    change(); media.addEventListener('change', change);
    return () => { preload.disconnect(); visibility.disconnect(); media.removeEventListener('change', change); };
  }, []);
  useEffect(() => {
    if (!near || failed || !canvas.current || !root.current) return;
    let cancelled = false;
    let instance: Handle | null = null, observer: ResizeObserver | undefined;
    let cancelStart: (() => void) | undefined;
    const target = canvas.current, node = root.current;
    import('./runtime').then(module => {
      if (cancelled) return;
      const start = () => {
        if (cancelled) return;
        instance = module.mountWatch(target, config, controls.current, () => { if (!cancelled) setReady(true); }, () => { if (!cancelled) { setReady(false); setFailed(true); } });
        if (!instance) return;
        handle.current = instance;
        observer = new ResizeObserver(() => instance?.resize(node.clientWidth, node.clientHeight));
        observer.observe(node); instance.resize(node.clientWidth, node.clientHeight); instance.setActive(visibleRef.current);
      };
      if (typeof window.requestIdleCallback === 'function') {
        const idle = window.requestIdleCallback(start, { timeout: 750 });
        cancelStart = () => window.cancelIdleCallback(idle);
      } else {
        const timer = window.setTimeout(start, 16);
        cancelStart = () => window.clearTimeout(timer);
      }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; cancelStart?.(); observer?.disconnect(); instance?.dispose(); if (handle.current === instance) handle.current = null; setReady(false); };
    // Visibility changes are sent to the existing shared renderer below.
  }, [near, failed, config]);
  useEffect(() => { handle.current?.setActive(visible); }, [visible, near]);
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.stopPropagation();
    pointer.current = { id: event.pointerId, x: event.clientX, startX: event.clientX, startY: event.clientY, last: performance.now(), moved: false };
    controls.current.velocity = 0;
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    if (!p.moved && Math.abs(event.clientX - p.startX) > 6 && Math.abs(event.clientX - p.startX) > Math.abs(event.clientY - p.startY)) { p.moved = true; controls.current.dragging = true; event.currentTarget.setPointerCapture(event.pointerId); }
    if (!p.moved) return;
    const now = performance.now(), delta = event.clientX - p.x;
    controls.current.rotation += delta * DRAG_SENSITIVITY;
    controls.current.velocity = delta * DRAG_SENSITIVITY / Math.max(1, now - p.last);
    p.x = event.clientX; p.last = now; handle.current?.invalidate();
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== event.pointerId) return;
    suppressClick.current = p.moved && event.type === 'pointerup'; pointer.current = null;
    controls.current.dragging = false; controls.current.resumeAt = performance.now() + RESUME_DELAY_MS;
    if (controls.current.reduced) controls.current.velocity = 0;
    handle.current?.invalidate();
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!ready || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    controls.current.rotation += event.key === 'ArrowRight' ? .18 : -.18;
    controls.current.velocity = 0; controls.current.resumeAt = performance.now() + RESUME_DELAY_MS; handle.current?.invalidate();
  };
  return <div ref={root} translate="no" className={`notranslate ${styles.viewport} ${ready ? styles.ready : ''}`}
    role="img" aria-label={`${alt} — interactive 3D preview. Drag or use left and right arrows to rotate.`} aria-busy={!ready && !failed} tabIndex={ready ? 0 : undefined}
    onPointerEnter={e => { if (e.pointerType === 'mouse') controls.current.hovered = true; }}
    onPointerLeave={e => { if (e.pointerType === 'mouse') controls.current.hovered = false; }}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onKeyDown={key}
    onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}>
    {!ready && !failed && <span className={`${styles.loading} ${visible ? styles.loadingActive : ''}`} aria-hidden="true"><i /></span>}
    {failed && fallbackSrc && !posterError && <div className={styles.poster}><Image src={fallbackSrc} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" priority={priority} loading={priority ? undefined : 'lazy'} onError={() => setPosterError(true)} /></div>}
    <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
  </div>;
}
