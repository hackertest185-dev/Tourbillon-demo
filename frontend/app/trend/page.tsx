import TrendSignInCta from './TrendSignInCta';
import TrendWatchDnaStudio from './TrendWatchDnaStudio';
import TrendStaffPicks from './TrendStaffPicks';
import TrendMostViewed from './TrendMostViewed';
import ScrollFade from '../scrollMotion/ScrollFade';

export default function TrendPage() {
  return (
    <main dir="rtl" className="relative overflow-hidden pt-10">

      <section className="relative min-h-[calc(100svh-88px)] px-6 py-20 pt-20 sm:px-10 lg:px-24">
        <div>
          <ScrollFade>
            <div className="max-w-5xl">
              <div className="w-10 h-px bg-[#bfa68a]/55 mb-10" />
              <h1 className="font-playfair font-light leading-[1.45] text-[#f0e6d2]" style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)' }}>
                ساعات اختارناها بعناية، وساعات عليها إقبال، وترشيحات على ذوقك إنت.
              </h1>
              <div className="mt-10 flex items-start gap-6 max-w-2xl">
                <div className="w-6 h-px bg-[#bfa68a]/45 flex-shrink-0 mt-[0.6em]" />
                <p className="text-[13px] leading-relaxed text-white/45 text-balance">
                  اكتشف اختيارات فريقنا، وشوف الساعات اللي الناس بتتفرج عليها أكتر، وكمان ترشيحات مخصوص ليك على حسب الساعات اللي بتعجبك وبتدور عليها.
                </p>
              </div>
            </div>
          </ScrollFade>

          <div className="mt-20">
            <TrendStaffPicks />
          </div>

          <div className="mt-20">
            <TrendMostViewed />
          </div>

          <div className="mt-20">
            <TrendWatchDnaStudio />
            <TrendSignInCta />
          </div>
        </div>
      </section>
    </main>
  );
}
