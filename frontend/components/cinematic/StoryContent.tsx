'use client';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBrands } from '@/lib/api';
import { CHAPTERS } from './config';
import styles from './cinematic.module.css';

export function MaisonLinks({ orbit = false }: { orbit?: boolean }) {
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });
  return <div data-lenis-prevent="true" className={orbit ? styles.maisonOrbit : styles.maisonList} aria-label="اكتشف براندات الساعات">
    {brands.map(({ name, slug }, index) => {
      const angle = (index / brands.length) * Math.PI * 2;
      // Semantic HTML on a CSS 3D ellipse, rather than inaccessible canvas text.
      const position = orbit ? { '--orbit-x': `${Math.sin(angle) * 37}vw`, '--orbit-y': `${Math.cos(angle) * 24}vh`, '--orbit-z': `${Math.cos(angle) * 120}px` } as CSSProperties : undefined;
      return <Link key={slug} href={`/watches?brand=${encodeURIComponent(slug)}`} prefetch={false} style={position}>
        <span className={styles.maisonNumber}>{String(index + 1).padStart(2, '0')}</span><span translate="no" className="notranslate">{name}</span>
      </Link>;
    })}
  </div>;
}

function WatchCollectionCta() {
  return <Link
    href="/watches"
    prefetch={false}
    scroll
    className={styles.watchCta}
    aria-label="شوف ساعاتنا"
    onClick={(event) => {
      // A hard navigation releases GSAP's pinned stage before the catalogue
      // loads, so mobile browsers always arrive at the top of /watches.
      event.preventDefault();
      window.location.assign('/watches');
    }}
  >
    <span className={styles.watchCtaDial} aria-hidden="true">
      <i className={styles.watchCtaHandHour} />
      <i className={styles.watchCtaHandMinute} />
      <b />
    </span>
    <span className={styles.watchCtaCopy}>
      <span className={styles.watchCtaKicker}>مستني إيه؟</span>
      <strong>شوف ساعاتنا</strong>
      <span className={styles.watchCtaAction}>اضغط هنا <span aria-hidden="true">↗</span></span>
    </span>
  </Link>;
}

export function ChapterContent({ index, enhanced }: { index: number; enhanced: boolean }) {
  const chapter = CHAPTERS[index];
  return <>
    <div className={styles.copy}>
      <p className={styles.eyebrow}><span>{chapter.numeral}</span><i aria-hidden="true" />{chapter.label}</p>
      <h2 id={`cinema-heading-${index}`} tabIndex={-1} className={styles.heading} aria-label={chapter.title.join(' ')}>
        {chapter.title.map(line => <span className={styles.lineMask} key={line} aria-hidden="true"><span data-reveal>{line}</span></span>)}
      </h2>
      <p className={styles.description}>{chapter.description}</p>
      {index === 6 && <WatchCollectionCta />}
    </div>
    {index === 4 && <MaisonLinks orbit={enhanced} />}
    <p className={styles.detail}><span aria-hidden="true">✦</span>{chapter.detail}</p>
    {index === 6 && <footer className={styles.footer}>
      <Link href="/tourbillon" className={styles.footerWordmark} translate="no">Tourbillon</Link><span>فن الوقت.</span>
      <nav aria-label="روابط الصفحة"><Link href="/stories">حكايات</Link><Link href="/contact">كلمنا</Link><Link href="/compare">قارن</Link></nav>
    </footer>}
  </>;
}

export function StaticWatch() {
  return <svg className={styles.staticWatch} viewBox="0 0 600 800" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="cinema-gold" x1="100" y1="180" x2="500" y2="620" gradientUnits="userSpaceOnUse"><stop stopColor="#EDE4D3" /><stop offset=".3" stopColor="#B08D57" /><stop offset=".65" stopColor="#403223" /><stop offset="1" stopColor="#B08D57" /></linearGradient>
      <radialGradient id="cinema-dial"><stop stopColor="#2b231b" /><stop offset="1" stopColor="#0A0907" /></radialGradient>
    </defs>
    <path d="M232 50H368L384 225H216ZM216 575H384L368 750H232Z" fill="#18120f" stroke="#594634" />
    <circle cx="300" cy="400" r="197" fill="url(#cinema-dial)" stroke="url(#cinema-gold)" strokeWidth="19" />
    <circle cx="300" cy="400" r="177" stroke="#B08D57" />
    {Array.from({ length: 60 }, (_, i) => <path key={i} d={i % 5 === 0 ? 'M300 235V255' : 'M300 235V243'} stroke="#B08D57" strokeWidth={i % 5 === 0 ? 4 : 1} transform={`rotate(${i * 6} 300 400)`} />)}
    <rect x="500" y="381" width="28" height="38" rx="7" fill="url(#cinema-gold)" />
    {[[-60, -40, 54], [65, -22, 40], [0, 75, 61]].map(([x, y, r], i) => <g key={i} transform={`translate(${300 + x} ${400 + y})`}><circle r={r} stroke="#B08D57" strokeWidth="5" strokeDasharray="4 5" /><circle r={r * .78} stroke="#B08D57" /><path d={`M${-r * .7} 0H${r * .7}M0 ${-r * .7}V${r * .7}`} stroke="#B08D57" strokeWidth="6" /><circle r="7" fill="#7A1F2B" stroke="#B08D57" /></g>)}
    <path d="M300 400L242 329M300 400L403 314" stroke="#EDE4D3" strokeWidth="8" strokeLinecap="round" /><circle cx="300" cy="400" r="10" fill="#B08D57" />
  </svg>;
}
