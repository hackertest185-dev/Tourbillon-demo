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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let visible = false;
    const syncPlayback = () => {
      if (visible && allowPlayback && !document.hidden) void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.01 });
    observer.observe(video);
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      video.pause();
    };
  }, [allowPlayback]);

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
      <picture className="absolute inset-0 block overflow-hidden">
        <source media="(max-width: 767px)" srcSet="/tourbillon-video-poster-mobile.webp" />
        <img
          src="/tourbillon-video-poster-desktop.webp"
          alt=""
          aria-hidden="true"
          width="1672"
          height="941"
          fetchPriority="high"
          decoding="async"
          className={styles.heroMedia}
        />
      </picture>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="ساعة ميكانيكية بتتحرك"
        className={`absolute inset-0 ${styles.heroMedia}`}
      >
        <source media="(max-width: 767px)" src="/tourbillon-hero-mobile.mp4" type="video/mp4" />
        <source src="/tourbillon-hero-desktop.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/25" />
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
