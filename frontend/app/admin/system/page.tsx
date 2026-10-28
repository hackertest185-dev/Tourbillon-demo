'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  adminGetEmbeddingStatus, adminGenerateEmbeddings, adminRegenerateEmbeddings,
  adminGetQueryCacheStatus, adminSeedQueryCache, adminClearQueryCache,
  adminMigrateImageUrls, adminMigrateToS3, adminNormalizeImageNames,
  adminCleanCloudinaryOrphans,
  getMfaStatus, setupMfa, enableMfa,
  EmbeddingStatus, QueryCacheStatus,
} from '@/lib/api';

interface CardProps {
  title: string;
  children: React.ReactNode;
}
function Card({ title, children }: CardProps) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-5">
      <h2 className="text-white text-sm font-medium mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111] last:border-0">
      <span className="text-[#555] text-xs">{label}</span>
      <span className="text-[#888] text-xs font-mono">{value}</span>
    </div>
  );
}

function ActionBtn({ label, onClick, danger = false, disabled = false }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded text-xs transition-colors disabled:opacity-50 ${danger ? 'bg-red-900/60 text-red-300 hover:bg-red-800' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
    >{label}</button>
  );
}

export default function AdminSystemPage() {
  const { isAdmin } = useAuth();
  const [embStatus, setEmbStatus] = useState<EmbeddingStatus | null>(null);
  const [cacheStatus, setCacheStatus] = useState<QueryCacheStatus | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<Record<string, boolean>>({});
  const [mfaStatus, setMfaStatus] = useState<{ enabled: boolean; required: boolean } | null>(null);
  const [mfaSetup, setMfaSetup] = useState<{ sharedKey: string; authenticatorUri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    adminGetEmbeddingStatus().then(setEmbStatus).catch(() => null);
    adminGetQueryCacheStatus().then(setCacheStatus).catch(() => null);
    getMfaStatus().then(setMfaStatus).catch(() => null);
  }, [isAdmin]);

  const act = async (key: string, fn: () => Promise<string>) => {
    setWorking(w => ({ ...w, [key]: true }));
    setMsg(m => ({ ...m, [key]: '' }));
    try {
      const m = await fn();
      setMsg(prev => ({ ...prev, [key]: m }));
    } catch (e: unknown) {
      setMsg(prev => ({ ...prev, [key]: e instanceof Error ? e.message : "حصلت مشكلة" }));
    } finally {
      setWorking(w => ({ ...w, [key]: false }));
    }
  };

  const handleGenerateEmbeddings = () => act('emb', async () => {
    const r = await adminGenerateEmbeddings();
    setEmbStatus(r);
    return `Generated ${r.generated} — coverage ${r.coveragePct.toFixed(0)}%`;
  });

  const handleRegenerateEmbeddings = () => act('emb-regen', async () => {
    if (!confirm('Regenerate ALL embeddings from scratch? This can take a while.')) return 'Cancelled';
    const r = await adminRegenerateEmbeddings();
    setEmbStatus(r);
    return `Regenerated ${r.regenerated} — coverage ${r.coveragePct.toFixed(0)}%`;
  });

  const handleSeedCache = () => act('cache-seed', async () => {
    const r = await adminSeedQueryCache();
    adminGetQueryCacheStatus().then(setCacheStatus).catch(() => null);
    return r.message;
  });

  const handleClearCache = () => act('cache-clear', async () => {
    if (!confirm('Clear the query cache?')) return 'Cancelled';
    const r = await adminClearQueryCache();
    adminGetQueryCacheStatus().then(setCacheStatus).catch(() => null);
    return r.message;
  });

  const handleMigrateUrls = () => act('img-urls', async () => {
    const r = await adminMigrateImageUrls(false);
    return `${r.message} (${r.count} updated)`;
  });

  const handleMigrateS3 = () => act('img-s3', async () => {
    if (!confirm('Migrate all Cloudinary-hosted images to S3? This makes real network requests.')) return 'Cancelled';
    const r = await adminMigrateToS3(false);
    return r.message ?? "تم";
  });

  const handleNormalizeNames = () => act('img-names', async () => {
    const r = await adminNormalizeImageNames(false);
    return `${r.message} — ${r.updated} updated`;
  });

  const handleCleanOrphans = () => act('img-orphans', async () => {
    if (!confirm('Delete Cloudinary assets not referenced by any watch? Use dry run first.')) return 'Cancelled';
    const r = await adminCleanCloudinaryOrphans(false);
    return r.message;
  });

  const handleCleanOrphansDry = () => act('img-orphans-dry', async () => {
    const r = await adminCleanCloudinaryOrphans(true);
    return `Dry run: ${r.message}`;
  });

  const handleMfaSetup = () => act('mfa-setup', async () => {
    const setup = await setupMfa();
    setMfaSetup(setup);
    return 'Scan the URI or enter the key in your authenticator app.';
  });

  const handleMfaEnable = () => act('mfa-enable', async () => {
    const result = await enableMfa(mfaCode);
    setRecoveryCodes(result.recoveryCodes);
    setMfaCode('');
    setMfaStatus({ enabled: true, required: mfaStatus?.required ?? false });
    return 'MFA enabled. Save the recovery codes securely.';
  });

  const W = working;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-white">النظام</h1>
        <p className="text-[#555] text-xs mt-0.5">صيانة بيانات البحث الذكي والبيانات المتخزنة مؤقتًا</p>
      </div>

      <Card title="التحقق الإضافي للأدمن">
        <p className="text-[#777] text-xs mb-3">
          {mfaStatus?.enabled
            ? "التحقق الإضافي بتطبيق المصادقة شغّال على الحساب ده."
            : "ظبّط تطبيق المصادقة قبل ما تفعّل شرط التحقق الإضافي لتعديلات الأدمن على الموقع المنشور."}
        </p>
        {!mfaStatus?.enabled && (
          <div className="space-y-3">
            <ActionBtn label={W['mfa-setup'] ? "بنجهّز..." : "ابدأ الإعداد"} onClick={handleMfaSetup} disabled={W['mfa-setup']} />
            {mfaSetup && (
              <div className="space-y-2">
                <p className="text-[#555] text-[11px] break-all">المفتاح: <span className="text-[#aaa] font-mono">{mfaSetup.sharedKey}</span></p>
                <p className="text-[#555] text-[11px] break-all">لينك الإعداد: <span className="text-[#aaa] font-mono">{mfaSetup.authenticatorUri}</span></p>
                <div className="flex gap-2 items-center">
                  <input
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\s/g, ''))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="كود من 6 أرقام"
                    className="bg-black border border-[#292929] rounded px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <ActionBtn label={W['mfa-enable'] ? "بنشغّل..." : "شغّل التحقق الإضافي"} onClick={handleMfaEnable} disabled={W['mfa-enable'] || mfaCode.length < 6} />
                </div>
              </div>
            )}
          </div>
        )}
        {msg['mfa-setup'] && <p className="text-green-400 text-xs mt-3">{msg['mfa-setup']}</p>}
        {msg['mfa-enable'] && <p className="text-green-400 text-xs mt-3">{msg['mfa-enable']}</p>}
        {recoveryCodes && (
          <div className="mt-3 border border-yellow-800/60 bg-yellow-950/20 rounded p-3">
            <p className="text-yellow-300 text-xs mb-2">احفظ أكواد استرجاع الدخول دلوقتي. مش هتظهر تاني.</p>
            <p className="text-yellow-100 text-xs font-mono break-all">{recoveryCodes.join(' · ')}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        <Card title="بيانات الساعات للبحث الذكي">
          {embStatus && (
            <div className="mb-4 space-y-0.5">
              <Stat label="إجمالي الساعات" value={embStatus.total} />
              <Stat label="اتجهزت للبحث الذكي" value={embStatus.embedded} />
              <Stat label="نسبة التغطية" value={`${embStatus.coveragePct.toFixed(1)}%`} />
            </div>
          )}
          {embStatus && (
            <div className="mb-3 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className="h-full bg-[#c9a96e]" style={{ width: `${embStatus.coveragePct}%` }} />
            </div>
          )}
          {msg['emb'] && <p className="text-green-400 text-xs mb-3">{msg['emb']}</p>}
          {msg['emb-regen'] && <p className="text-green-400 text-xs mb-3">{msg['emb-regen']}</p>}
          <div className="flex gap-2">
            <ActionBtn label={W['emb'] ? "بنجهّز..." : "جهّز اللي ناقص"} onClick={handleGenerateEmbeddings} disabled={W['emb']} />
            <ActionBtn label={W['emb-regen'] ? "بنعيد التجهيز..." : "جهّز الكل من جديد"} onClick={handleRegenerateEmbeddings} disabled={W['emb-regen']} danger />
          </div>
        </Card>

        <Card title="البحث المتخزن مؤقتًا">
          {cacheStatus && (
            <div className="mb-4 space-y-0.5">
              <Stat label="إجمالي السجلات" value={cacheStatus.total} />
              <Stat label="البحث عن ساعة" value={cacheStatus.watch_finder} />
              <Stat label="شات الذكاء الاصطناعي" value={cacheStatus.rag_chat} />
              {cacheStatus.message && <Stat label="الحالة" value={cacheStatus.message} />}
            </div>
          )}
          {msg['cache-seed'] && <p className="text-green-400 text-xs mb-3">{msg['cache-seed']}</p>}
          {msg['cache-clear'] && <p className="text-green-400 text-xs mb-3">{msg['cache-clear']}</p>}
          <div className="flex gap-2">
            <ActionBtn label={W['cache-seed'] ? "بنضيف البيانات..." : "ضيف بيانات البحث"} onClick={handleSeedCache} disabled={W['cache-seed']} />
            <ActionBtn label={W['cache-clear'] ? "بنمسح..." : "امسح البيانات المؤقتة"} onClick={handleClearCache} disabled={W['cache-clear']} danger />
          </div>
        </Card>

        <Card title="صيانة الصور">
          <div className="space-y-3">
            <div>
              <p className="text-[#444] text-xs mb-2">صلّح لينكات الصور القديمة وحوّلها لمعرّفات الملفات</p>
              {msg['img-urls'] && <p className="text-green-400 text-xs mb-2">{msg['img-urls']}</p>}
              <ActionBtn label={W['img-urls'] ? "شغّال..." : "حدّث لينكات الصور"} onClick={handleMigrateUrls} disabled={W['img-urls']} />
            </div>
            <div className="border-t border-[#111] pt-3">
              <p className="text-[#444] text-xs mb-2">وحّد أسماء الصور باسم البراند والموديل</p>
              {msg['img-names'] && <p className="text-green-400 text-xs mb-2">{msg['img-names']}</p>}
              <ActionBtn label={W['img-names'] ? "شغّال..." : "وحّد أسماء الصور"} onClick={handleNormalizeNames} disabled={W['img-names']} />
            </div>
          </div>
        </Card>

        <Card title="نقل ملفات التخزين">
          <div className="space-y-3">
            <div>
              <p className="text-[#444] text-xs mb-2">انقل صور الساعات من Cloudinary لـ S3</p>
              {msg['img-s3'] && <p className="text-green-400 text-xs mb-2">{msg['img-s3']}</p>}
              <ActionBtn label={W['img-s3'] ? "بننقل..." : "انقل لـ S3"} onClick={handleMigrateS3} disabled={W['img-s3']} danger />
            </div>
            <div className="border-t border-[#111] pt-3">
              <p className="text-[#444] text-xs mb-2">امسح ملفات Cloudinary اللي مش مرتبطة بأي ساعة</p>
              {msg['img-orphans-dry'] && <p className="text-green-400 text-xs mb-2">{msg['img-orphans-dry']}</p>}
              {msg['img-orphans'] && <p className="text-green-400 text-xs mb-2">{msg['img-orphans']}</p>}
              <div className="flex gap-2">
                <ActionBtn label={W['img-orphans-dry'] ? "شغّال..." : "معاينة من غير تنفيذ"} onClick={handleCleanOrphansDry} disabled={W['img-orphans-dry']} />
                <ActionBtn label={W['img-orphans'] ? "بنمسح..." : "امسح الملفات اللي ملهاش ساعة"} onClick={handleCleanOrphans} disabled={W['img-orphans']} danger />
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
