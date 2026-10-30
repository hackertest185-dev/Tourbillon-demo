'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCart } from '@/lib/api';

export default function CartNavLink() {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    if (!isAuthenticated) { setCount(0); return; }
    const refresh = () => getCart().then(cart => { if (active) setCount(cart.items.reduce((sum, item) => sum + item.quantity, 0)); }).catch(() => { if (active) setCount(0); });
    refresh();
    window.addEventListener('velora-cart-updated', refresh);
    return () => { active = false; window.removeEventListener('velora-cart-updated', refresh); };
  }, [isAuthenticated]);

  return (
    <Link href="/cart" aria-label={`السلة${count ? `، فيها ${count} منتجات` : ''}`} className="relative inline-flex h-7 w-7 items-center justify-center transition-opacity hover:opacity-70 md:h-10 md:w-10">
      <ShoppingBag className="h-6 w-6 md:h-8 md:w-8" strokeWidth={1.5} />
      {count > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#bfa68a] px-1 text-[9px] font-bold text-[#1a1008]">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}
