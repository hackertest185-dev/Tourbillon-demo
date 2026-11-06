'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CartResponse, getCart, updateCartItem, removeCartItem, createStoreOrder } from '@/lib/api';

const money = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const panel = 'rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5';

export default function CartPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => setCart(await getCart());
  useEffect(() => {
    if (!loading && !user) router.replace('/auth/start?returnTo=/cart');
    if (user) refresh().catch(error => setMessage(error instanceof Error ? error.message : 'معرفناش نحمل السلة.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const changeQuantity = async (watchId: number, quantity: number) => {
    setMessage(''); setBusy(true);
    try { setCart(await updateCartItem(watchId, quantity)); window.dispatchEvent(new Event('velora-cart-updated')); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'الكمية دي مش متاحة.'); }
    finally { setBusy(false); }
  };
  const remove = async (watchId: number) => {
    setBusy(true);
    try { setCart(await removeCartItem(watchId)); window.dispatchEvent(new Event('velora-cart-updated')); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'معرفناش نشيل الساعة.'); }
    finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const order = await createStoreOrder(phone, code.trim() || undefined);
      window.dispatchEvent(new Event('velora-cart-updated'));
      router.push(`/account/orders?new=${encodeURIComponent(order.orderNumber)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'معرفناش نبعت الطلب. راجع السلة وجرب تاني.'); }
    finally { setBusy(false); }
  };

  if (loading || !user) return <main className="min-h-screen bg-[#120d0a]" />;
  return <main className="min-h-screen bg-[#120d0a] px-4 pb-24 pt-24 text-[#f4eee4] sm:px-8 sm:pt-32">
    <div className="mx-auto max-w-5xl">
      <p className="mb-2 text-xs tracking-[.25em] text-[#bfa68a]">VELORA · YOUR SELECTION</p>
      <h1 className="mb-8 text-3xl font-semibold">سلة مشترياتك</h1>
      {message && <p role="alert" className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-100">{message}</p>}
      {!cart ? <p className="text-white/60">بنحمّل السلة…</p> : cart.items.length === 0 ? <section className={`${panel} text-center`}><p className="mb-4 text-white/70">لسه ما ضفتش ساعات للسلة.</p><Link className="inline-flex rounded-lg bg-[#bfa68a] px-5 py-3 font-medium text-black" href="/watches">شوف الساعات</Link></section> : <div className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <section className="space-y-3">{cart.items.map(item => <article key={item.watchId} className={`${panel} grid grid-cols-[5rem_minmax(0,1fr)] gap-3 sm:flex sm:gap-4`}>
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/40 sm:h-24 sm:w-24">{item.image && <img src={item.image} alt={item.name} className="h-full w-full object-contain" />}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[.12em] text-white/45 sm:text-xs">{item.brand}</p>
            <h2 dir="ltr" className="mt-1 line-clamp-2 text-start text-sm font-medium leading-5 sm:text-base">{item.name}</h2>
            <p className="mt-1 text-sm text-[#d7c3a5]">{money(item.unitPrice)} <span className="text-xs text-white/45">سعر الساعة</span></p>
            <div className="mt-3 hidden flex-wrap items-center gap-3 sm:flex"><div className="flex items-center overflow-hidden rounded-lg border border-white/15"><button disabled={busy || item.quantity <= 1} onClick={() => changeQuantity(item.watchId, item.quantity - 1)} className="px-3 py-1 disabled:opacity-30" aria-label="قلل الكمية">−</button><span className="min-w-8 text-center">{item.quantity}</span><button disabled={busy || item.quantity >= item.stockQuantity} onClick={() => changeQuantity(item.watchId, item.quantity + 1)} className="px-3 py-1 disabled:opacity-30" aria-label="زود الكمية">+</button></div><span className="text-sm text-white/60">المتاح {item.stockQuantity}</span><button disabled={busy} onClick={() => remove(item.watchId)} className="text-sm text-red-200/70 hover:text-red-100">شيلها</button></div>
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3 border-t border-white/10 pt-3 sm:hidden">
            <span className="text-xs text-white/50">الإجمالي</span><strong className="text-base text-[#f1dfc5]">{money(item.lineTotal)}</strong>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-2 sm:hidden">
            <div className="flex h-10 items-center overflow-hidden rounded-lg border border-white/15"><button disabled={busy || item.quantity <= 1} onClick={() => changeQuantity(item.watchId, item.quantity - 1)} className="h-10 w-10 disabled:opacity-30" aria-label="قلل الكمية">−</button><span className="min-w-8 text-center text-sm">{item.quantity}</span><button disabled={busy || item.quantity >= item.stockQuantity} onClick={() => changeQuantity(item.watchId, item.quantity + 1)} className="h-10 w-10 disabled:opacity-30" aria-label="زود الكمية">+</button></div>
            <span className="text-xs text-white/55">المتاح {item.stockQuantity}</span><button disabled={busy} onClick={() => remove(item.watchId)} className="ms-auto min-h-10 px-2 text-sm text-red-200/75 hover:text-red-100">شيلها</button>
          </div>
          <strong className="hidden shrink-0 sm:block">{money(item.lineTotal)}</strong>
        </article>)}</section>
        <form onSubmit={submit} className={`${panel} h-fit space-y-5`}>
          <h2 className="text-xl font-medium">ابعت طلبك</h2><div className="flex justify-between border-b border-white/10 pb-4 text-white/70"><span>الإجمالي قبل الخصم</span><span>{money(cart.subtotal)}</span></div>
          <label className="block text-sm">رقم واتساب للتواصل<input required dir="ltr" type="tel" autoComplete="tel" placeholder="+2010XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-left text-white outline-none focus:border-[#bfa68a]" /><span className="mt-1 block text-xs text-white/45">ممكن تكتبه بالمصري، وهنظبطه تلقائيًا.</span></label>
          <label className="block text-sm">كود الخصم لو معاك<input dir="ltr" value={code} onChange={e => setCode(e.target.value)} placeholder="CODE" className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 uppercase text-white outline-none focus:border-[#bfa68a]" /></label>
          <p className="rounded-lg bg-[#bfa68a]/10 p-3 text-sm leading-6 text-white/70">إرسال الطلب مش بيسحب فلوس. هنتواصل معاك على واتساب لتأكيد التفاصيل؛ الدفع والتسليم بيتأكدوا يدويًا بعد الاتفاق.</p>
          <button disabled={busy} className="w-full rounded-lg bg-[#bfa68a] px-5 py-3 font-semibold text-black disabled:opacity-50">{busy ? 'بنجهّز الطلب…' : 'إرسال الطلب'}</button>
        </form>
      </div>}
    </div>
  </main>;
}
