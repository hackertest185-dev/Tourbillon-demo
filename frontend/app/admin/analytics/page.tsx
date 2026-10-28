'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  adminGetScrapeStats, adminGetEditorialStatus, adminGetEmbeddingStatus, adminGetQueryCacheStatus,
  ScrapeStats, EditorialStatus, EmbeddingStatus, QueryCacheStatus,
} from '@/lib/api';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-5">
      <h2 className="text-white text-sm font-medium mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[#111] last:border-0">
      <span className="text-[#555] text-xs">{label}</span>
      <span className={`text-xs font-mono ${accent ? 'text-[#c9a96e]' : 'text-[#888]'}`}>{value}</span>
    </div>
  );
}

function CoverageBar({ pct }: { pct: number }) {
  return (
    <div className="mt-3 mb-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
      <div className="h-full bg-[#c9a96e]" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { isAdmin } = useAuth();
  const [scrape, setScrape] = useState<ScrapeStats | null>(null);
  const [editorial, setEditorial] = useState<EditorialStatus | null>(null);
  const [embedding, setEmbedding] = useState<EmbeddingStatus | null>(null);
  const [cache, setCache] = useState<QueryCacheStatus | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    adminGetScrapeStats().then(setScrape).catch(() => null);
    adminGetEditorialStatus().then(setEditorial).catch(() => null);
    adminGetEmbeddingStatus().then(setEmbedding).catch(() => null);
    adminGetQueryCacheStatus().then(setCache).catch(() => null);
  }, [isAdmin]);

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-white">الإحصائيات</h1>
        <p className="text-[#555] text-xs mt-0.5">نظرة سريعة على حالة الموقع والمحتوى</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        <Card title="الساعات المتاحة">
          {scrape ? (
            <>
              <Stat label="البراندات" value={scrape.totalBrands} accent />
              <Stat label="المجموعات" value={scrape.totalCollections} />
              <Stat label="الساعات" value={scrape.totalWatches} accent />
              {scrape.lastScrapedAt && (
                <Stat label="آخر مرة اتسحبت فيها البيانات" value={new Date(scrape.lastScrapedAt).toLocaleDateString()} />
              )}
            </>
          ) : <p className="text-[#333] text-xs">بنحمّل...</p>}
        </Card>

        <Card title="نسبة تغطية المحتوى">
          {editorial ? (
            <>
              <Stat label="إجمالي الساعات" value={editorial.total} />
              <Stat label="ساعات ليها محتوى" value={editorial.withEditorial} accent />
              <Stat label="نسبة التغطية" value={`${editorial.coveragePct.toFixed(1)}%`} accent />
              <CoverageBar pct={editorial.coveragePct} />
            </>
          ) : <p className="text-[#333] text-xs">بنحمّل...</p>}
        </Card>

        <Card title="بيانات الذكاء الاصطناعي للبحث">
          {embedding ? (
            <>
              <Stat label="إجمالي الساعات" value={embedding.total} />
              <Stat label="اتجهزت للبحث الذكي" value={embedding.embedded} accent />
              <Stat label="نسبة التغطية" value={`${embedding.coveragePct.toFixed(1)}%`} accent />
              <CoverageBar pct={embedding.coveragePct} />
            </>
          ) : <p className="text-[#333] text-xs">بنحمّل...</p>}
        </Card>

        <Card title="البحث المتخزن مؤقتًا">
          {cache ? (
            <>
              <Stat label="إجمالي عمليات البحث المتخزنة" value={cache.total} accent />
              <Stat label="البحث عن ساعة" value={cache.watch_finder} />
              <Stat label="شات الذكاء الاصطناعي" value={cache.rag_chat} />
              {cache.message && <Stat label="الحالة" value={cache.message} />}
            </>
          ) : <p className="text-[#333] text-xs">بنحمّل...</p>}
        </Card>

      </div>
    </div>
  );
}
