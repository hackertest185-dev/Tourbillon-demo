'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { CINEMA } from './config';
import styles from './cinematic.module.css';

export function AmbientSound({ active }: { active: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!enabled || !active) return;
    let stopped = false;
    if (CINEMA.ambientSound) {
      const track = new Audio(CINEMA.ambientSound);
      track.loop = true; track.volume = .12; audio.current = track;
      void track.play().catch(() => { if (!stopped) { setEnabled(false); setUnavailable(true); } });
    } else {
      const ctx = context.current;
      if (ctx) {
        const tick = () => {
          if (ctx.state !== 'running' || document.hidden) return;
          const oscillator = ctx.createOscillator();
          const envelope = ctx.createGain();
          oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(1800, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + .028);
          envelope.gain.setValueAtTime(.0001, ctx.currentTime);
          envelope.gain.exponentialRampToValueAtTime(.012, ctx.currentTime + .003);
          envelope.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .045);
          oscillator.connect(envelope); envelope.connect(ctx.destination);
          oscillator.start(); oscillator.stop(ctx.currentTime + .05);
          oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        };
        interval.current = setInterval(tick, 500);
      }
    }
    const visibility = () => {
      if (document.hidden) { audio.current?.pause(); void context.current?.suspend(); }
      else { void audio.current?.play().catch(() => setEnabled(false)); void context.current?.resume(); }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stopped = true;
      if (interval.current) clearInterval(interval.current);
      if (audio.current) { audio.current.pause(); audio.current.src = ''; audio.current = null; }
      void context.current?.suspend();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [enabled, active]);
  useEffect(() => () => { void context.current?.close(); }, []);
  async function toggle() {
    if (!enabled && !CINEMA.ambientSound) {
      try { context.current ??= new AudioContext(); await context.current.resume(); }
      catch { setUnavailable(true); return; }
    }
    setEnabled(value => !value);
  }
  return <button type="button" className={styles.sound} onClick={() => void toggle()} aria-pressed={enabled} disabled={unavailable}
    aria-label={unavailable ? 'صوت الخلفية مش متاح دلوقتي' : enabled ? 'اقفل صوت التكتكة' : 'شغّل صوت التكتكة'}>
    <span className={styles.soundBars} data-on={enabled}><i /><i /><i /><i /></span>
    <span>الصوت {enabled ? 'شغال' : 'مقفول'}</span>
  </button>;
}

export function CinematicCursor({ root, active }: { root: RefObject<HTMLDivElement | null>; active: boolean }) {
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = root.current;
    if (!host || !active || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    let x = -100, y = -100, targetX = -100, targetY = -100;
    const move = (event: PointerEvent) => {
      targetX = event.clientX; targetY = event.clientY;
      if (ring.current) {
        ring.current.style.opacity = '1';
        ring.current.dataset.interactive = String(Boolean((event.target as Element).closest('a,button,input')));
      }
    };
    const leave = () => { if (ring.current) ring.current.style.opacity = '0'; };
    const animate = () => {
      x += (targetX - x) * .14; y += (targetY - y) * .14;
      if (ring.current) ring.current.style.transform = `translate3d(${x}px,${y}px,0)`;
      frame = requestAnimationFrame(animate);
    };
    host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave);
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); };
  }, [active, root]);
  return active ? <div ref={ring} className={styles.cursor} aria-hidden="true"><i /></div> : null;
}
