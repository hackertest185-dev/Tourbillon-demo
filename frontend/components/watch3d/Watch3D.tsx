'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { configForWatch, type WatchVisualSource } from './config';
import { PHOTO_SECONDS, PRELOAD_MARGIN, type WatchControls } from './settings';
import type { mountWatch } from './runtime';
import styles from './Watch3D.module.css';

type Handle = NonNullable<ReturnType<typeof mountWatch>>;
export default function Watch3D({ watch, fallbackSrc, alt, index, priority = false }: {
  watch: WatchVisualSource; fallbackSrc?: string | null; alt: string; index: number; priority?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<Handle | null>(null);
  const controls = useRef<WatchControls>({ rotation: (index % 8) * .13 - .35, initialRotation: (index % 8) * .13 - .35, reduced: false, photoReady: false });
  const [near, setNear] = useState(false), [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [posterError, setPosterError] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false), [photoReady, setPhotoReady] = useState(false);
  // A revision bypasses previously optimized copies made from the old lossy
  // catalogue images. Keep the API's image field and model data unchanged.
  const photoSrc = fallbackSrc?.startsWith('/catalogue/')
    ? `${fallbackSrc}${fallbackSrc.includes('?') ? '&' : '?'}v=clean-cutout-20261029` : fallbackSrc;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const { id, name, slug, specs } = watch;
  const config = useMemo(() => configForWatch({ id, name, slug, specs }), [id, name, slug, specs]);
  useEffect(() => { setFailed(false); setReady(false); setShowPhoto(false); }, [config]);
  useEffect(() => { setPosterError(false); setPhotoReady(false); controls.current.photoReady = false; setShowPhoto(false); }, [photoSrc]);
  useEffect(() => { controls.current.initialRotation = controls.current.rotation = (index % 8) * .13 - .35; handle.current?.invalidate(); }, [index]);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const preload = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: PRELOAD_MARGIN });
    const visibility = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    preload.observe(node); visibility.observe(node);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { controls.current.reduced = media.matches; handle.current?.invalidate(); };
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
        instance = module.mountWatch(target, config, controls.current,
          () => { if (!cancelled) setReady(true); },
          () => { if (!cancelled) { setReady(false); setFailed(true); setShowPhoto(false); } },
          show => { if (!cancelled) setShowPhoto(show); });
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
    return () => { cancelled = true; cancelStart?.(); observer?.disconnect(); instance?.dispose(); if (handle.current === instance) handle.current = null; setReady(false); setShowPhoto(false); };
    // Visibility changes are sent to the existing shared renderer below.
  }, [near, failed, config]);
  useEffect(() => { handle.current?.setActive(visible); }, [visible, near]);
  const photoVisible = photoReady && !posterError && (failed || (ready && showPhoto));
  return <div ref={root} translate="no" className={`notranslate ${styles.viewport} ${ready ? styles.ready : ''} ${photoVisible ? styles.photoVisible : ''}`}
    role="img" aria-label={`${alt} — الساعة بتلف تلقائيًا، وبعد لفة كاملة بتظهر صورتها الحقيقية ${PHOTO_SECONDS} ثواني.`} aria-busy={!ready && !failed}
    data-presentation={photoVisible ? (failed ? 'fallback' : 'photo') : ready ? 'model' : failed ? 'unavailable' : 'loading'}>
    {!ready && !failed && <span className={`${styles.loading} ${visible ? styles.loadingActive : ''}`} aria-hidden="true"><i /></span>}
    {(near || failed) && photoSrc && !posterError && <div className={styles.poster} aria-hidden="true"><Image src={photoSrc} alt="" fill quality={95} sizes="(min-width: 1280px) 40vw, (min-width: 768px) 50vw, 100vw" priority={priority} loading={priority ? undefined : 'lazy'} draggable={false}
      onLoad={() => { setPhotoReady(true); controls.current.photoReady = true; handle.current?.invalidate(); }}
      onError={() => { setPosterError(true); setPhotoReady(false); controls.current.photoReady = false; setShowPhoto(false); handle.current?.invalidate(); }} /></div>}
    {failed && !photoReady && <span className={styles.unavailable}>{posterError || !photoSrc ? 'الصورة مش متاحة دلوقتي' : 'بنحمّل صورة الساعة...'}</span>}
    <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
  </div>;
}
