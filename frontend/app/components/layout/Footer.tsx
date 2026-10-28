// Site-wide footer with a stronger editorial brand lead and restrained utility navigation.
// Keeps the warm metallic palette, avoids dead links, and leaves visual room for the concierge pill.
'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ROUTES } from '@/app/constants/routes';

const navigationColumns = [
  {
    title: "اكتشف",
    links: [
      { label: "الساعات", href: ROUTES.WATCHES, description: "اتفرج على كل الساعات اللي عندنا." },
      { label: "حكايات", href: ROUTES.STORIES, description: "اقرأ حكايات ومعلومات مميزة عن عالم الساعات." },
      { label: "البحث الذكي", href: '/tourbillon#smart-search', description: "قولنا بتدور على ساعة شكلها إيه، وابدأ البحث من الصفحة الرئيسية." },
      { label: "قارن", href: '/compare', description: "قارن تفاصيل الساعات جنب بعض." },
    ],
  },
  {
    title: "خدمة العملاء",
    links: [
      { label: "ذوقك في الساعات", href: '/tourbillon#watch-dna', description: "شوف إزاي اختياراتك بتساعدنا نرشحلك ساعات على ذوقك." },
      { label: "المفضلة", href: '/favourites', description: "خلي الساعات اللي عجبتك متسجلة عندك عشان ترجع لها بسهولة." },
      { label: "سجّل دخول", href: ROUTES.LOGIN, description: "ادخل على حسابك وشوف الساعات والحاجات اللي حفظتها." },
      { label: "لينكد إن", href: 'https://www.linkedin.com/in/hoanganhchu/', description: "تابع المشروع واللي اشتغل عليه." },
    ],
  },
];

function FooterNavLink({
  href,
  label,
  description,
  delay = 0,
}: {
  href: string;
  label: string;
  description: string;
  delay?: number;
}) {
  const isExternal = href.startsWith('http');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group border-b border-white/6 pb-4 transition-colors duration-300 hover:border-[#bfa68a]/18"
    >
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="group block"
    >
      <span className="relative inline-flex w-fit text-[1.02rem] font-inter text-white/68 transition-colors duration-300 group-hover:text-[#f0e6d2]">
        {label}
        <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[#bfa68a]/60 transition-transform duration-300 group-hover:scale-x-100" />
      </span>
      <span className="mt-2 block text-[12px] leading-relaxed text-white/24 font-inter transition-colors duration-300 group-hover:text-white/34">
        {description}
      </span>
    </Link>
    </motion.div>
  );
}

function FooterCta({
  href,
  label,
  variant = 'gold',
}: {
  href: string;
  label: string;
  variant?: 'gold' | 'muted';
}) {
  const baseClassName =
    'relative inline-flex w-fit items-center justify-center overflow-hidden border px-10 py-4 text-[10px] uppercase tracking-[0.3em] transition-all duration-500 group whitespace-nowrap';
  const variantClassName =
    variant === 'gold'
      ? 'border-[#bfa68a]/25 text-[#bfa68a] hover:bg-[#bfa68a]/8 hover:border-[#bfa68a]/40'
      : 'border-white/12 text-white/42 hover:border-[#bfa68a]/28 hover:bg-[#bfa68a]/[0.03] hover:text-[#f0e6d2]/82';

  return (
    <Link href={href} className={`${baseClassName} ${variantClassName}`}>
      <span className="transform transition-transform duration-500 group-hover:-translate-x-3">
        {label}
      </span>
      <span className="absolute right-6 opacity-0 -translate-x-4 text-[14px] transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100">
        →
      </span>
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.012)_0%,rgba(255,255,255,0.004)_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-45"
          style={{
            background:
              'radial-gradient(ellipse 58% 54% at 20% 10%, rgba(191,166,138,0.06) 0%, transparent 64%)',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, rgba(191,166,138,0) 0%, rgba(191,166,138,0.32) 50%, rgba(191,166,138,0) 100%)',
          }}
        />
      </div>

      <div className="relative px-8 sm:px-10 lg:px-16 xl:px-20">
        <div className="grid grid-cols-1 border-b border-white/[0.06] lg:grid-cols-2">
          <div className="py-11 sm:py-12 lg:pr-14 xl:pr-16">
            <p className="mb-6 text-[9px] uppercase tracking-[0.38em] text-[#bfa68a] font-inter">
              Tourbillon
            </p>
            <div className="max-w-xl border-s border-[#bfa68a]/28 ps-6 sm:ps-8">
              <h2 className="font-playfair text-[2.25rem] font-light leading-[0.95] text-[#f0e6d2] sm:text-[2.75rem]">
                ساعات مختارة بعناية للي بيحبوا الفخامة الهادية من غير مبالغة.
              </h2>
              <p className="mt-5 max-w-md text-[14px] leading-relaxed text-white/42 font-inter sm:text-[15px]">
                بنساعدك تكتشف ساعات مميزة بطريقة هادية وراقية، من أول حكاية كل ساعة لحد ما تلاقي اللي يناسب ذوقك.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <FooterCta href={ROUTES.CONTACT} label="احجز مع خبير ساعات" />
            </div>
          </div>

          <div className="border-t border-white/[0.06] py-11 sm:py-12 lg:border-l lg:border-t-0 lg:pl-14 xl:pl-16">
            {/* Two columns side by side on phones too, per design request. */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-12 xl:gap-x-16">
            {navigationColumns.map((column, columnIndex) => (
              <motion.div
                key={column.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: columnIndex * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="mb-6 text-[9px] uppercase tracking-[0.38em] text-[#bfa68a] font-inter">
                  {column.title}
                </p>
                <div className="flex flex-col gap-5">
                  {column.links.map((link, linkIndex) => (
                    <FooterNavLink
                      key={link.label}
                      href={link.href}
                      label={link.label}
                      description={link.description}
                      delay={columnIndex * 0.12 + linkIndex * 0.08}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 py-6 text-[11px] tracking-[0.14em] text-white/22 font-inter md:py-7 lg:pr-56 xl:pr-64">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>السعر متاح لما تسأل عنه</span>
          </div>
          <p className="text-white/45 text-[12px] tracking-[0.08em]">
            كل الصور والفيديوهات المعروضة هنا لغرض عرض المشروع والتجربة بس، ومش للاستخدام التجاري.
          </p>
        </div>
      </div>
    </footer>
  );
}
