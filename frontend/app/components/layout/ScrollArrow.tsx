// Side scroll arrow — a small brand-styled control pinned to the right edge.
// Scrolls down one screen per tap on mobile and desktop; flips into a
// "back to top" arrow once the page bottom is reached.
// Respects Lenis smooth scrolling when the provider is mounted.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLenis } from 'lenis/react';

export default function ScrollArrow() {
  const lenis = useLenis();
  const [hidden, setHidden] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  const evaluate = useCallback(() => {
    const el = document.scrollingElement ?? document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    setHidden(max < 120);
    setAtEnd(el.scrollTop >= max - 40);
  }, []);

  useEffect(() => {
    evaluate();
    window.addEventListener('scroll', evaluate, { passive: true });
    window.addEventListener('resize', evaluate);
    lenis?.on('scroll', () => evaluate());
    return () => {
      window.removeEventListener('scroll', evaluate);
      window.removeEventListener('resize', evaluate);
      lenis?.off('scroll', () => evaluate());
    };
  }, [evaluate, lenis]);

  const scrollDown = useCallback(() => {
    const el = document.scrollingElement ?? document.documentElement;
    const step = window.innerHeight * 0.9;
    const target = Math.min(el.scrollTop + step, el.scrollHeight - el.clientHeight);
    if (lenis) lenis.scrollTo(target, { duration: 1.2, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: target, behavior: 'smooth' });
  }, [lenis]);

  const scrollTop = useCallback(() => {
    if (lenis) lenis.scrollTo(0, { duration: 1.4, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lenis]);

  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={atEnd ? scrollTop : scrollDown}
      aria-label={atEnd ? "ارجع لفوق" : "انزل لتحت"}
      className="fixed right-1 md:right-3 bottom-24 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-30 flex h-12 w-9 md:h-14 md:w-11 items-center justify-center rounded-full border border-[#bfa68a55] bg-[#1e1512]/60 text-[#f0e6d2] backdrop-blur-md shadow-[0_4px_18px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-[#bfa68a] hover:bg-[#1e1512]/85 active:scale-95"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-5 w-5 transition-transform duration-500 ${atEnd ? 'rotate-180' : ''}`}
        aria-hidden
      >
        <path d="M12 4v16m0 0l-6-6m6 6l6-6" />
      </svg>
    </button>
  );
}
