// Contact page — displays business contact information
// Publicly accessible, no authentication required
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppointmentPanel from '@/app/components/appointment/AppointmentPanel';
import ScrollFade from '@/app/scrollMotion/ScrollFade';

const contactItems = [
  {
    label: 'Email',
    value: 'nourammar877@gmail.com',
    href: 'mailto:nourammar877@gmail.com',
  },
  {
    label: 'WhatsApp',
    value: '01030888493',
    href: 'https://wa.me/201030888493?text=Hello%20Tourbillon%2C%20I%27d%20like%20to%20ask%20about%20a%20watch.',
  },
  {
    label: 'Address',
    value: 'Alexandria',
    href: null,
  },
  {
    label: 'Hours',
    value: 'Monday – Saturday\n10:00 am – 6:00 pm',
    href: null,
  },
];

export default function ContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const panelOpenedRef = useRef(false);

  useEffect(() => {
    const panel = searchParams.get('panel');
    if (panel !== 'appointment' || panelOpenedRef.current) return;
    panelOpenedRef.current = true;
    setAppointmentOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('panel');
    const newSearch = params.toString();
    router.replace(`/contact${newSearch ? `?${newSearch}` : ''}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <>
      <div className="min-h-screen text-white">

        {/* Hero */}
        <ScrollFade>
        <div className="relative flex flex-col justify-end px-10 lg:px-24 pt-44 pb-20 border-b border-white/5">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative text-[10px] uppercase tracking-[0.45em] text-[#bfa68a]/80 mb-5"
          >
            Get in Touch
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="relative font-playfair font-light text-[#f0e6d2] leading-none mb-6 -ml-[0.06em]"
            style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}
          >
            Contact Us
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative text-white/35 text-sm max-w-[380px] leading-relaxed text-balance"
          >
            Our advisors are available to assist with acquisitions, valuations,
            and any enquiry about our collection.
          </motion.p>
        </div>
        </ScrollFade>

        {/* Contact grid */}
        <div className="px-10 lg:px-24 py-20 grid grid-cols-1 lg:grid-cols-2 gap-0">

          {/* Left — contact details */}
          <ScrollFade>
          <div className="lg:border-r border-[#bfa68a]/8 lg:pr-20 pb-16 lg:pb-0">
            <p className="text-[10px] uppercase tracking-[0.45em] text-[#bfa68a]/80 mb-10">Contact Information</p>
            <div>
              {contactItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="flex items-start justify-between py-6 border-b border-white/5 group"
                >
                  <span className="text-[9px] uppercase tracking-[0.35em] text-[#bfa68a]/75 w-20 shrink-0 pt-0.5">
                    {item.label}
                  </span>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-white/60 hover:text-[#f0e6d2] transition text-sm text-right leading-relaxed whitespace-pre-line"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-white/60 text-sm text-right leading-relaxed whitespace-pre-line">
                      {item.value}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.a
                href="https://wa.me/201030888493?text=Hello%20Tourbillon%2C%20I%27d%20like%20to%20ask%20about%20a%20watch."
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contact us on WhatsApp"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden border border-[#bfa68a]/25 px-5 py-5 hover:border-[#bfa68a]/60 hover:bg-[#bfa68a]/8 transition-colors"
              >
                <motion.span
                  aria-hidden="true"
                  animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-4 inline-flex text-[#bfa68a]"
                >
                  <MessageCircle size={27} strokeWidth={1.5} />
                </motion.span>
                <span className="block text-[10px] uppercase tracking-[0.25em] text-[#f0e6d2]">
                  Call us on WhatsApp
                </span>
                <span className="mt-2 block text-xs text-white/40">01030888493</span>
                <span className="absolute bottom-4 right-5 text-[#bfa68a]/70 transition-transform group-hover:translate-x-1">→</span>
              </motion.a>

              <motion.a
                href="mailto:nourammar877@gmail.com?subject=Tourbillon%20Inquiry"
                aria-label="Send us an email"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden border border-[#bfa68a]/25 px-5 py-5 hover:border-[#bfa68a]/60 hover:bg-[#bfa68a]/8 transition-colors"
              >
                <motion.span
                  aria-hidden="true"
                  animate={{ y: [0, -5, 0], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
                  className="mb-4 inline-flex text-[#bfa68a]"
                >
                  <Mail size={27} strokeWidth={1.5} />
                </motion.span>
                <span className="block text-[10px] uppercase tracking-[0.25em] text-[#f0e6d2]">
                  Send us an Email
                </span>
                <span className="mt-2 block text-xs text-white/40 break-all">nourammar877@gmail.com</span>
                <span className="absolute bottom-4 right-5 text-[#bfa68a]/70 transition-transform group-hover:translate-x-1">→</span>
              </motion.a>
            </div>
          </div>
          </ScrollFade>

          {/* Right — advisory note */}
          <ScrollFade>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="lg:pl-20 pt-16 lg:pt-0 flex flex-col justify-between"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.45em] text-[#bfa68a]/80 mb-10">Private Advisory</p>

              <blockquote className="border-l-2 border-[#bfa68a]/60 pl-6 mb-10 py-1">
                <p className="text-[#f0e6d2] font-playfair text-[1.4rem] leading-relaxed italic">
                  &ldquo;Every great timepiece deserves a conversation.&rdquo;
                </p>
              </blockquote>

              <p className="text-white/35 text-sm leading-relaxed mb-10 max-w-sm">
                Reach out for personalised assistance with bespoke acquisitions, watch valuations, or Price on Request timepieces. Our specialists respond within 24 to 48 hours.
              </p>

              <button
                type="button"
                onClick={() => setAppointmentOpen(true)}
                className="relative inline-flex items-center justify-center text-[10px] uppercase tracking-[0.3em] text-[#bfa68a] border border-[#bfa68a]/25 px-12 py-4 hover:bg-[#bfa68a]/8 hover:border-[#bfa68a]/40 transition-all duration-500 group overflow-hidden mb-4"
              >
                <span className="transform transition-transform duration-500 group-hover:-translate-x-3">
                  Book an Appointment
                </span>
                <span className="absolute right-8 opacity-0 -translate-x-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0 text-[14px]">
                  →
                </span>
              </button>

              <a
                href="mailto:nourammar877@gmail.com?subject=Tourbillon%20Inquiry"
                className="relative inline-flex items-center justify-center text-[10px] uppercase tracking-[0.3em] text-[#bfa68a] border border-[#bfa68a]/25 px-12 py-4 hover:bg-[#bfa68a]/8 hover:border-[#bfa68a]/40 transition-all duration-500 group overflow-hidden"
              >
                <span className="transform transition-transform duration-500 group-hover:-translate-x-3">
                  Send an Email
                </span>
                <span className="absolute right-8 opacity-0 -translate-x-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0 text-[14px]">
                  →
                </span>
              </a>
            </div>

          </motion.div>
          </ScrollFade>

        </div>
      </div>
      <AppointmentPanel
        isOpen={appointmentOpen}
        onClose={() => setAppointmentOpen(false)}
        brandName="Tourbillon"
        redirectPath="/contact?panel=appointment"
      />
    </>
  );
}
