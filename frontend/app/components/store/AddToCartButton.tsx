'use client';

import { useState, type MouseEvent } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { addCartItem } from '@/lib/api';
import { withReturnTo } from '@/lib/returnNavigation';

export default function AddToCartButton({ watchId, className = '' }: { watchId: number; className?: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [adding, setAdding] = useState(false);

  const add = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      router.push(withReturnTo('/auth/start', '/cart'));
      return;
    }
    setAdding(true);
    try {
      await addCartItem(watchId);
      window.dispatchEvent(new Event('velora-cart-updated'));
      toast.success('الساعة اتضافت للسلة.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'معرفناش نضيف الساعة للسلة.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <button type="button" onClick={add} disabled={adding} aria-label="أضف للسلة"
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-50 ${className}`}>
      <ShoppingBag size={16} aria-hidden="true" />
      <span>{adding ? 'بنضيف...' : 'أضف للسلة'}</span>
    </button>
  );
}
