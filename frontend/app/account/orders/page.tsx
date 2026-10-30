'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getMyStoreOrders, StoreOrder } from '@/lib/api';

const money = (n: number, currency: string) => `${currency === 'USD' ? '$' : ''}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (d: string) => new Date(d).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
const statusText: Record<string, string> = { pending_contact: 'مستنيين نتواصل معاك', contacted: 'اتواصلنا معاك', delivered: 'اتأكد التسليم والدفع', cancelled: 'الطلب اتلغى' };

export default function MyOrdersPage() {
  const { user, loading } = useAuth(); const router = useRouter();
  const [orders, setOrders] = useState<StoreOrder[]>([]); const [busy, setBusy] = useState(true);
  const [printOrderId, setPrintOrderId] = useState<number | null>(null);
  const [newOrder, setNewOrder] = useState('');
  useEffect(() => { setNewOrder(new URLSearchParams(window.location.search).get('new') || ''); }, []);
  useEffect(() => { if (!loading && !user) router.replace('/auth/start?returnTo=/account/orders'); if (user) getMyStoreOrders().then(setOrders).finally(() => setBusy(false)); }, [loading, user, router]);
  const printReceipt = (id: number) => { setPrintOrderId(id); window.setTimeout(() => window.print(), 150); };
  if (loading || !user) return <main className="min-h-screen bg-[#120d0a]" />;
  return <main className="min-h-screen bg-[#120d0a] px-4 pb-24 pt-32 text-[#f4eee4] print:bg-white print:px-0 print:pt-0 print:text-black"><div className="mx-auto max-w-4xl">
    <div className="mb-8 print:hidden"><p className="mb-2 text-xs tracking-[.25em] text-[#bfa68a]">YOUR ORDERS</p><h1 className="text-3xl font-semibold">طلباتي</h1></div>
    {newOrder && <p className="mb-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] p-4 text-emerald-100 print:hidden">طلبك {newOrder} اتبعت بنجاح. هنتواصل معاك على واتساب لتأكيد التفاصيل.</p>}
    {busy ? <p className="text-white/60 print:hidden">بنحمّل طلباتك…</p> : orders.length === 0 ? <p className="rounded-xl border border-white/10 p-6 text-white/65 print:hidden">مفيش طلبات لسه.</p> : <div className="space-y-5">{orders.map(order => <article key={order.id} className={`rounded-2xl border border-white/10 bg-white/[.035] p-5 print:break-inside-avoid print:border-black/20 print:bg-white ${printOrderId !== null && printOrderId !== order.id ? 'print:hidden' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4 print:border-black/15"><div><p className="text-sm text-white/50 print:text-gray-600">رقم الطلب</p><h2 dir="ltr" className="font-mono text-lg">{order.orderNumber}</h2><p className="mt-1 text-xs text-white/45 print:text-gray-600">{date(order.createdAt)}</p></div><span className="rounded-full border border-[#bfa68a]/30 bg-[#bfa68a]/10 px-3 py-1 text-sm text-[#e2cba9] print:border-black/20 print:bg-white print:text-black">{statusText[order.status] || order.status}</span></div>
      <div className="space-y-2 py-4">{order.items.map((item, index) => <div key={`${item.watchId}-${index}`} className="flex justify-between gap-4 text-sm"><span dir="ltr" className="text-start">{item.brandName} · {item.watchName} × {item.quantity}</span><span>{money(item.unitPrice * item.quantity, order.currency)}</span></div>)}</div>
      {order.discountAmount > 0 && <div className="flex justify-between border-t border-white/10 pt-3 text-sm text-white/60 print:text-gray-600"><span>الخصم</span><span>−{money(order.discountAmount, order.currency)}</span></div>}
      <div className="flex justify-between border-t border-white/10 pt-3 font-semibold"><span>الإجمالي</span><span>{money(order.totalAmount, order.currency)}</span></div><p className="mt-3 text-sm text-white/55 print:text-gray-600">الدفع: {order.paymentStatus === 'paid' ? 'اتأكد بواسطة الإدارة' : 'لسه ما اتأكدش'} — الدفع مش بيتحقق تلقائيًا.</p>
      {order.status === 'delivered' && <button onClick={() => printReceipt(order.id)} className="mt-4 rounded-lg bg-[#bfa68a] px-4 py-2 text-sm font-medium text-black print:hidden">حفظ الإيصال PDF</button>}
    </article>)}</div>}
  </div><style jsx global>{`@media print { body { background:#fff !important; } body * { visibility:hidden !important; } main, main * { visibility:visible !important; } nav, header, footer, button { display:none !important; } main { position:absolute; inset:0; width:100%; min-height:0 !important; } }`}</style></main>;
}
