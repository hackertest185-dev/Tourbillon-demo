// Staff Picks section for the Trend page.
// Renders the editorial videos without a watch image beside them.
'use client';

import { useEffect, useRef } from 'react';
import { STAFF_PICKS } from './trendData';
import ScrollFade from '@/app/scrollMotion/ScrollFade';

function EditorialVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let inView = false;
    const syncPlayback = () => {
      if (inView && !document.hidden) void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.05 });
    observer.observe(video);
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      video.pause();
    };
  }, [src]);

  return <video ref={ref} muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover">
    <source src={src} type="video/mp4" />
  </video>;
}

export default function TrendStaffPicks() {
  return (
    <section className="border-t border-[#bfa68a]/12 pt-12">
      <ScrollFade>
      <div>
        <p className="text-[10px] uppercase tracking-[0.45em] text-[#bfa68a]/80">
          اختيارات فريقنا
        </p>
        <h2
          className="mt-4 font-playfair font-light leading-tight text-[#f0e6d2]"
          style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)' }}
        >
          ساعات اختارها فريقنا بعناية.
        </h2>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/45 text-balance">
          ساعات شدت انتباهنا بتصميمها ودقتها وفخامتها الهادية.
        </p>
      </div>
      </ScrollFade>

      <div className="mt-10 flex flex-col gap-20">
        {STAFF_PICKS.map((pick) => (
          <ScrollFade key={pick.slug}>
            <div className="relative mx-auto aspect-video w-full overflow-hidden lg:w-3/5">
              {pick.video && <EditorialVideo src={pick.video} />}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#1e1512]" />
            </div>
          </ScrollFade>
        ))}
      </div>
    </section>
  );
}
