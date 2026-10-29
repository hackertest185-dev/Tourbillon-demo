'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPendingGoogleLink, linkGoogleAccount } from '@/lib/api';
import { startGoogleAuth } from '@/lib/googleAuth';

export default function LinkGooglePage() {
  const router = useRouter();
  const [pending, setPending] = useState<{ email: string; hasPassword: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPendingGoogleLink()
      .then(value => { if (active) setPending(value); })
      .catch(() => { if (active) setError('تأكيد جوجل خلص وقته. ابدأ الدخول بجوجل تاني.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await linkGoogleAccount(password, requiresMfa ? code : undefined);
      if (result.requiresMfa) { setRequiresMfa(true); return; }
      if (result.linked) router.replace('/auth/callback?newAccount=0');
    } catch {
      setError('معرفناش نأكد الربط. اتأكد من الباسورد وكود التطبيق لو مطلوب، ولو تأكيد جوجل انتهى ابدأ تاني.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main dir="rtl" className="mx-auto flex min-h-[75vh] max-w-xl flex-col justify-center px-6 py-24 text-[#f0e6d2]">
      <p className="mb-3 text-xs text-[#bfa68a]">تأكيد ربط الحساب</p>
      <h1 className="mb-5 text-3xl">كمّل دخولك بجوجل بأمان</h1>
      {loading ? <p role="status">بنتأكد من حساب جوجل...</p> : pending && pending.hasPassword ? (
        <>
          <p className="mb-3 leading-7 text-white/65">عندك حساب بالإيميل ده بالفعل. اكتب باسورد حسابك على الموقع مرة واحدة علشان تربطه بجوجل.</p>
          <p dir="ltr" className="mb-7 break-all text-right text-sm text-[#bfa68a]">{pending.email}</p>
          <form onSubmit={submit} className="space-y-5">
            <label className="block space-y-2">
              <span>باسورد حسابك على الموقع</span>
              <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/25 p-3 text-white outline-none focus:border-[#bfa68a]" />
            </label>
            {requiresMfa && <label className="block space-y-2">
              <span>كود تطبيق المصادقة</span>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-lg border border-white/20 bg-black/25 p-3 text-white outline-none focus:border-[#bfa68a]" />
            </label>}
            <button disabled={saving} type="submit" className="w-full rounded-lg bg-[#bfa68a] px-5 py-3 font-medium text-[#211914] disabled:opacity-50">
              {saving ? 'بنأكد الربط...' : 'اربط حساب جوجل وادخل'}
            </button>
          </form>
        </>
      ) : pending ? <p className="leading-7 text-white/65">ادخل الأول بكود الإيميل وحدد باسورد من إعدادات حسابك، وبعدها اربطه بجوجل.</p> : null}
      {error && <p role="alert" className="mt-5 text-sm leading-7 text-red-300">{error}</p>}
      {!loading && <div className="mt-7 flex flex-wrap gap-6 text-sm text-[#bfa68a]">
        <button type="button" onClick={() => startGoogleAuth()}>ابدأ الدخول بجوجل تاني</button>
        <Link href="/login">ارجع لتسجيل الدخول</Link>
      </div>}
    </main>
  );
}
