'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import styles from './VideoSection.module.css';

gsap.registerPlugin(ScrollTrigger);

export default function VideoSection({ allowPlayback = true }: { allowPlayback?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const sync = () => frame?.contentWindow?.postMessage({ type: 'tourbillon:set-active', active: allowPlayback && !document.hidden }, window.location.origin);
    sync();
    frame?.addEventListener('load', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      frame?.removeEventListener('load', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [allowPlayback]);

  useEffect(() => {
    const scrollFromWatch = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'tourbillon:scroll-next') return;
      window.dispatchEvent(new CustomEvent('tourbillon-scroll-next'));
    };
    window.addEventListener('message', scrollFromWatch);
    return () => window.removeEventListener('message', scrollFromWatch);
  }, []);

  useGSAP(() => {
    if (!sectionRef.current || !scrollHintRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 767px), (pointer: coarse)').matches) return;

    gsap.to(scrollHintRef.current, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=150',
        scrub: 1,
      },
    });
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-[#1e1512]"
      style={{ height: 'calc(100vh + 3rem + 50px)', marginTop: 'calc(-3rem - 50px)' }}
    >
      <iframe
        ref={frameRef}
        src="/tourbillon-watch-3d.html"
        title="ساعة Tourbillon تفاعلية ثلاثية الأبعاد"
        className={styles.heroFrame}
        loading="eager"
        allow="fullscreen"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/20" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#1e1512]" />
      <div
        ref={scrollHintRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 select-none text-xs uppercase tracking-[0.2em] text-white/40 animate-bounce"
      >
        انزل لتحت
      </div>
    </section>
  );
}
