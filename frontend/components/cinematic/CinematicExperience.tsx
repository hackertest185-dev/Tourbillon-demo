'use client';

import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ErrorInfo, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from 'lenis/react';
import VideoSection from '@/app/components/homepage/VideoSection';
import { useCursor } from '@/contexts/CursorContext';
import { CHAPTERS, CINEMA, smoothstep, type CinemaMotion } from './config';
import { ChapterContent, StaticWatch } from './StoryContent';
import { AmbientSound, CinematicCursor } from './ExperienceControls';
import styles from './cinematic.module.css';

const WatchScene = dynamic(() => import('./WatchScene'), { ssr: false });
gsap.registerPlugin(ScrollTrigger);

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

export default function CinematicExperience() {
  const [mode, setMode] = useState<'pending' | 'cinematic' | 'static'>('pending');
  const [mobile, setMobile] = useState(false);
  const [booting, setBooting] = useState(true);
  const [loadProgress, setLoadProgress] = useState(10);
  const [sceneReady, setSceneReady] = useState(false);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [chapter, setChapter] = useState(0);
  const [forceStatic, setForceStatic] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const story = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const progressBar = useRef<HTMLSpanElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const motion = useRef<CinemaMotion>({ progress: 0, pointer: [0, 0], active: false });
  const lastChapter = useRef(0);
  const lenis = useLenis();
  const { cursor } = useCursor();
  const enhanced = mode === 'cinematic' && !forceStatic;
  const onFailure = useCallback(() => { setMode('static'); setSceneReady(false); }, []);
  const onReady = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const small = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const video = hero.current?.querySelector('video');
    let disposed = false;
    let completed = false;
    let supported = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setMobile(small.matches);
    setLoadProgress(25);
    const finish = () => {
      if (disposed || completed) return;
      completed = true;
      setLoadProgress(100);
      supported = !preference.matches && supportsWebGL();
      setMode(supported ? 'cinematic' : 'static');
      timers.push(setTimeout(() => { if (!disposed) setBooting(false); }, preference.matches ? 0 : 600));
    };
    const ready = () => { setLoadProgress(75); timers.push(setTimeout(finish, 350)); };
    if (!video || video.readyState >= 2 || preference.matches) ready();
    else { video.addEventListener('loadeddata', ready, { once: true }); video.addEventListener('error', finish, { once: true }); }
    // A blocked video/network must never trap the visitor behind a loader.
    timers.push(setTimeout(finish, 4000));
    const preferenceChange = () => {
      if (completed) { supported = !preference.matches && supportsWebGL(); setMode(supported ? 'cinematic' : 'static'); }
    };
    const sizeChange = () => setMobile(small.matches);
    const visibilityChange = () => setTabVisible(!document.hidden);
    preference.addEventListener('change', preferenceChange); small.addEventListener('change', sizeChange);
    document.addEventListener('visibilitychange', visibilityChange);
    return () => {
      disposed = true; timers.forEach(clearTimeout);
      video?.removeEventListener('loadeddata', ready); video?.removeEventListener('error', finish);
      preference.removeEventListener('change', preferenceChange); small.removeEventListener('change', sizeChange);
      document.removeEventListener('visibilitychange', visibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!stage.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting); motion.current.active = entry.isIntersecting;
    }, { threshold: .02 });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [enhanced]);

  useEffect(() => {
    const element = stage.current;
    if (!element || !enhanced || mobile) return;
    const move = (event: PointerEvent) => {
      motion.current.pointer = [(event.clientX / window.innerWidth - .5) * 2, (event.clientY / window.innerHeight - .5) * 2];
    };
    const leave = () => { motion.current.pointer = [0, 0]; };
    element.addEventListener('pointermove', move); element.addEventListener('pointerleave', leave);
    return () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); };
  }, [enhanced, mobile]);

  useLayoutEffect(() => {
    if (!enhanced || !story.current || !stage.current) return;
    const panels = Array.from(stage.current.querySelectorAll<HTMLElement>('[data-chapter]'));
    const playhead = { value: 0 };
    const update = () => {
      const value = playhead.value;
      motion.current.progress = value;
      const next = Math.max(0, Math.min(6, Math.round(value)));
      if (lastChapter.current !== next) {
        const previous = panels[lastChapter.current];
        const transferFocus = previous?.contains(document.activeElement);
        lastChapter.current = next; setChapter(next);
        if (transferFocus) panels[next].querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      }
      if (progressBar.current) progressBar.current.style.transform = `scaleY(${value / 6})`;
      panels.forEach((panel, i) => {
        const distance = Math.abs(value - i);
        const opacity = 1 - smoothstep(.22, .58, distance);
        panel.style.opacity = String(opacity);
        panel.style.visibility = opacity > .001 ? 'visible' : 'hidden';
        panel.querySelectorAll<HTMLElement>('[data-reveal]').forEach((line, lineIndex) => {
          const offset = Math.min(1, Math.max(0, distance - .12 + lineIndex * .035));
          line.style.transform = `translateY(${offset * 95}%)`;
        });
      });
      stage.current?.style.setProperty('--orbit-turn', `${(value - 4) * 22}deg`);
    };
    const context = gsap.context(() => {
      const tween = gsap.to(playhead, {
        value: 6, ease: 'none', onUpdate: update,
        scrollTrigger: {
          trigger: story.current, start: 'top top', end: () => `+=${window.innerHeight * CINEMA.scrollScreens}`,
          pin: stage.current, pinType: 'transform', scrub: CINEMA.scrub, anticipatePin: 1, invalidateOnRefresh: true,
        },
      });
      trigger.current = tween.scrollTrigger ?? null;
      // Animate only the exit; the original hero component and resting appearance stay intact.
      const video = hero.current?.querySelector('video');
      if (video) gsap.to(video, { opacity: .08, filter: 'blur(9px)', ease: 'power3.inOut', scrollTrigger: { trigger: hero.current, start: 'bottom bottom', end: 'bottom top', scrub: 1 } });
      update();
    }, root);
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(refresh); context.revert(); trigger.current = null;
      panels.forEach(panel => { panel.style.removeProperty('opacity'); panel.style.removeProperty('visibility'); panel.querySelectorAll<HTMLElement>('[data-reveal]').forEach(line => line.style.removeProperty('transform')); });
    };
  }, [enhanced]);

  const goTo = useCallback((index: number, focus = false) => {
    const heading = document.getElementById(`cinema-heading-${index}`);
    const focusTarget = () => { if (focus) heading?.focus({ preventScroll: true }); };
    if (enhanced && trigger.current) {
      const position = trigger.current.start + index / 6 * (trigger.current.end - trigger.current.start);
      if (lenis) lenis.scrollTo(position, { duration: 2.1, easing: t => 1 - Math.pow(1 - t, 4), onComplete: focusTarget });
      else { window.scrollTo({ top: position, behavior: 'instant' }); focusTarget(); }
    } else { heading?.scrollIntoView({ behavior: 'instant', block: 'center' }); focusTarget(); }
  }, [enhanced, lenis]);

  useEffect(() => {
    if (mode === 'pending') return;
    const index = CHAPTERS.findIndex(item => `#${item.id}` === window.location.hash);
    if (index < 0) return;
    const frame = requestAnimationFrame(() => goTo(index));
    return () => cancelAnimationFrame(frame);
  }, [mode, goTo]);

  const colors = { '--cinema-black': CINEMA.colors.black, '--cinema-charcoal': CINEMA.colors.charcoal, '--cinema-gold': CINEMA.colors.gold, '--cinema-cream': CINEMA.colors.cream } as CSSProperties;
  return <div ref={root} className={styles.experience} style={colors} data-cinema-mode={enhanced ? 'cinematic' : 'static'}>
    <a href="#smart-search" className={styles.skipLink} onClick={event => { event.preventDefault(); goTo(5, true); }}>روح على طول لاختيار ساعتك</a>
    {booting && <div className={styles.loader} role="status" aria-label="بنجهزلك تجربة Tourbillon">
      <span translate="no" className={`${styles.loaderWordmark} notranslate`}>Tourbillon</span><span className={styles.loaderCaption}>فن الوقت</span>
      <span className={styles.loadTrack}><span style={{ transform: `scaleX(${loadProgress / 100})` }} /></span>
    </div>}
    <noscript><style>{`.${styles.loader}{display:none}`}</style></noscript>
    <div ref={hero}><VideoSection /></div>
    <div ref={story} className={`${styles.story} ${enhanced ? styles.enhanced : styles.still}`}>
      <div ref={stage} className={styles.stage}>
        <div className={styles.artwork} aria-hidden="true">
          {(!enhanced || !sceneReady) && <StaticWatch />}
          {enhanced && <SceneBoundary onFailure={onFailure}><WatchScene motion={motion} mobile={mobile}
            active={tabVisible && (inView || !sceneReady)} onFailure={onFailure} onReady={onReady} /></SceneBoundary>}
        </div>
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.folio} aria-hidden="true"><span translate="no" className="notranslate">Tourbillon / رحلة جوه عالم الساعات</span><span>الوقت ليه فن وحكاية.</span></div>
        {CHAPTERS.map((item, index) => <section key={item.id} id={item.id} data-chapter={index}
          className={`${styles.panel} ${styles[`chapter${index}`]}`} aria-labelledby={`cinema-heading-${index}`}
          aria-hidden={enhanced ? chapter !== index : undefined} inert={enhanced && chapter !== index}>
          <ChapterContent index={index} enhanced={enhanced} />
        </section>)}
        {enhanced && <>
          <nav className={styles.progress} aria-label="مراحل الرحلة">
            <div className={styles.progressTrack} aria-hidden="true"><span ref={progressBar} /></div>
            {CHAPTERS.slice(1, 6).map((item, i) => <button key={item.id} type="button" aria-label={`الفصل ${item.numeral}: ${item.label}`} aria-current={chapter === i + 1 ? 'step' : undefined} onClick={() => goTo(i + 1, true)}>{item.numeral}</button>)}
          </nav>
          <div className={styles.controls}><AmbientSound active={inView && tabVisible} /><button type="button" onClick={() => { setForceStatic(true); setSceneReady(false); }} className={styles.stillButton}>الوضع الثابت</button></div>
          <CinematicCursor root={stage} active={inView && !mobile && cursor === 'default'} />
        </>}
      </div>
    </div>
  </div>;
}
