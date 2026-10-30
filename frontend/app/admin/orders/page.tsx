'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminCancelOrder, adminConfirmOrderContact, adminConfirmOrderDelivery, adminCreateDiscountCode, adminGetDiscountCodes, adminGetStoreOrders, adminSetDiscountActive, DiscountCode, StoreOrder } from '@/lib/api';

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const orderStatus: Record<string, string> = { pending_contact: 'مستني رسالة واتساب', contacted: 'اتواصلنا مع العميل', delivered: 'اتأكد التسليم والدفع', cancelled: 'ملغي' };
const button = 'rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:border-[#bfa68a]/70 disabled:opacity-40';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]); const [sales, setSales] = useState(0); const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [busy, setBusy] = useState(true); const [working, setWorking] = useState<number | null>(null); const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});
  const [code, setCode] = useState(''); const [kind, setKind] = useState<'percent' | 'fixed'>('percent'); const [value, setValue] = useState(''); const [limit, setLimit] = useState(''); const [expires, setExpires] = useState('');

  const reload = useCallback(async () => {
    const [orderResult, codeResult] = await Promise.all([adminGetStoreOrders(), adminGetDiscountCodes()]);
    setOrders(orderResult.orders); setSales(orderResult.salesTotal); setCodes(codeResult);
  }, []);
  useEffect(() => { reload().catch(e => toast.error(e instanceof Error ? e.message : 'معرفناش نحمل الطلبات.')).finally(() => setBusy(false)); }, [reload]);

  const run = async (id: number, action: () => Promise<void>, success: string) => {
    setWorking(id);
    try { await action(); await reload(); toast.success(success); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'العملية ماكملتش.'); }
    finally { setWorking(null); }
  };
  const whatsappUrl = (order: StoreOrder) => {
    const number = order.whatsAppNumber.replace(/\D/g, '');
    const lines = [`أهلًا ${order.customerName}، معاك فريق VELORA بخصوص طلبك ${order.orderNumber}:`, ...order.items.map(i => `• ${i.brandName || ''} ${i.watchName} × ${i.quantity} — ${money(i.unitPrice * i.quantity)}`), `الإجمالي بعد الخصم: ${money(order.totalAmount)}`, 'رد علينا هنا عشان نأكد التوفر وطريقة الدفع والتسليم.'];
    return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
  };
  const createCode = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await adminCreateDiscountCode({ code, kind, value: Number(value), maxRedemptions: limit ? Number(limit) : null, expiresAt: expires ? new Date(expires).toISOString() : null, isActive: true }); setCode(''); setValue(''); setLimit(''); setExpires(''); await reload(); toast.success('كود الخصم اتعمل.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'معرفناش نعمل كود الخصم.'); }
  };

  return <div className="min-h-screen overflow-y-auto bg-[#0a0a0a] px-5 py-8 text-[#eee8df] md:px-10">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] tracking-[.3em] text-[#bfa68a]">STORE OPERATIONS</p><h1 className="mt-2 text-3xl font-semibold">الطلبات والمبيعات</h1><p className="mt-2 text-sm text-white/45">الدفع عبر InstaPay بيتأكد يدويًا بعد ما تراجع التحويل والتسليم.</p></div><div className="rounded-xl border border-[#bfa68a]/25 bg-[#bfa68a]/5 px-5 py-3"><p className="text-xs text-white/45">مبيعات الطلبات المكتملة</p><strong className="text-2xl text-[#dfc9aa]">{money(sales)}</strong></div></div>
    {busy ? <p className="text-white/50">بنحمّل…</p> : orders.length === 0 ? <p className="rounded-xl border border-white/10 p-6 text-white/50">مفيش طلبات لسه.</p> : <div className="space-y-4">{orders.map(order => <article key={order.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="flex flex-wrap justify-between gap-3 border-b border-white/10 pb-4"><div><h2 dir="ltr" className="font-mono text-lg">{order.orderNumber}</h2><p className="mt-1 text-sm text-white/55">{order.customerName || 'عميل'} · {order.customerEmail}</p><p dir="ltr" className="mt-1 text-start text-sm text-white/55">واتساب: {order.whatsAppNumber}</p></div><div className="text-end"><span className="rounded-full border border-[#bfa68a]/25 px-3 py-1 text-xs text-[#d9c4a7]">{orderStatus[order.status] || order.status}</span><p className="mt-2 text-xs text-white/45">الدفع: {order.paymentStatus === 'paid' ? 'متأكد يدويًا' : 'غير مدفوع'}</p></div></div>
      <div className="space-y-1 py-4">{order.items.map((item, index) => <div key={`${item.watchId}-${index}`} className="flex flex-wrap justify-between gap-2 text-sm"><span dir="ltr" className="text-start text-white/70">{item.brandName} · {item.watchName} × {item.quantity}</span><span>{money(item.unitPrice)} × {item.quantity}</span></div>)}</div>
      <div className="flex justify-between border-t border-white/10 pt-3 font-semibold"><span>الإجمالي</span><span>{money(order.totalAmount)} <span className="text-xs font-normal text-white/40">USD</span></span></div>
      {order.status === 'pending_contact' && <div className="mt-4 flex flex-wrap gap-2"><a className={`${button} border-[#25d366]/40 text-[#9ce6b4]`} href={whatsappUrl(order)} target="_blank" rel="noopener noreferrer">افتح واتساب برسالة جاهزة</a><button className={button} disabled={working === order.id} onClick={() => run(order.id, () => adminConfirmOrderContact(order.id), 'اتسجل إن رسالة واتساب اتبعتت.')}>تأكيد إرسال الرسالة</button><button className={`${button} text-red-200/70`} disabled={working === order.id} onClick={() => run(order.id, () => adminCancelOrder(order.id), 'الطلب اتلغى والمخزون رجع.')}>إلغاء الطلب</button></div>}
      {order.status === 'contacted' && <div className="mt-4 space-y-3 rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-4"><label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={!!confirmed[order.id]} onChange={e => setConfirmed(s => ({ ...s, [order.id]: e.target.checked }))} className="mt-1 accent-[#bfa68a]"/><span>أكدت بنفسي استلام التحويل على InstaPay، واتأكدت من تسليم الطلب للعميل.</span></label><button className={`${button} bg-[#bfa68a] font-medium text-black`} disabled={!confirmed[order.id] || working === order.id} onClick={() => run(order.id, () => adminConfirmOrderDelivery(order.id), 'اتأكد الدفع والتسليم واتسجلت المبيعة.')}>تأكيد الدفع والتسليم</button></div>}
      {order.status === 'delivered' && <p className="mt-4 text-sm text-emerald-200/70">تم التسليم والدفع يدويًا في {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('ar-EG') : '—'}.</p>}
      {order.status === 'cancelled' && <p className="mt-4 text-sm text-white/40">الطلب ملغي والمخزون اترد.</p>}
    </article>)}</div>}

    <section className="mt-12 rounded-2xl border border-white/10 bg-white/[.025] p-5"><h2 className="mb-1 text-xl font-medium">أكواد الخصم</h2><p className="mb-5 text-sm text-white/45">الأكواد بتتطبق على إجمالي السلة قبل إرسال الطلب.</p>
      <form onSubmit={createCode} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><input required minLength={3} maxLength={48} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="كود الخصم" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 uppercase outline-none"/><select value={kind} onChange={e => setKind(e.target.value as 'percent' | 'fixed')} className="rounded-lg border border-white/15 bg-[#171717] px-3 py-2"><option value="percent">نسبة مئوية</option><option value="fixed">مبلغ بالدولار</option></select><input required type="number" min="0.01" step="0.01" max={kind === 'percent' ? 100 : undefined} value={value} onChange={e => setValue(e.target.value)} placeholder={kind === 'percent' ? 'النسبة' : 'المبلغ'} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none"/><input type="number" min="1" value={limit} onChange={e => setLimit(e.target.value)} placeholder="عدد الاستخدامات (اختياري)" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none"/><input type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none"/><button className="rounded-lg bg-[#bfa68a] px-4 py-2 font-medium text-black">إضافة كود</button></form>
      <div className="mt-5 divide-y divide-white/10">{codes.map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><b dir="ltr" className="inline-block">{c.code}</b><span className="ms-3 text-sm text-white/55">{c.kind === 'percent' ? `${c.value}%` : money(c.value)} · {c.redemptionCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''} استخدام</span></div><button className={button} onClick={async () => { try { await adminSetDiscountActive(c.id, !c.isActive); await reload(); } catch (e) { toast.error(e instanceof Error ? e.message : 'معرفناش نغيّر حالة الكود.'); } }}>{c.isActive ? 'إيقاف الكود' : 'تفعيل الكود'}</button></div>)}</div>
    </section>
  </div>;
}
