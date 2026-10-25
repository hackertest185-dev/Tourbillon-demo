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
      setMsg(prev => ({ ...prev, [key]: e instanceof Error ? e.message : 'Error' }));
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
    return r.message ?? 'Done';
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
        <h1 className="text-xl font-semibold text-white">System</h1>
        <p className="text-[#555] text-xs mt-0.5">Embeddings, caches, and data maintenance</p>
      </div>

      <Card title="Administrator MFA">
        <p className="text-[#777] text-xs mb-3">
          {mfaStatus?.enabled
            ? 'Authenticator MFA is enabled for this account.'
            : 'Enable an authenticator app before enabling mandatory admin writes in production.'}
        </p>
        {!mfaStatus?.enabled && (
          <div className="space-y-3">
            <ActionBtn label={W['mfa-setup'] ? 'Preparing…' : 'Start Setup'} onClick={handleMfaSetup} disabled={W['mfa-setup']} />
            {mfaSetup && (
              <div className="space-y-2">
                <p className="text-[#555] text-[11px] break-all">Key: <span className="text-[#aaa] font-mono">{mfaSetup.sharedKey}</span></p>
                <p className="text-[#555] text-[11px] break-all">URI: <span className="text-[#aaa] font-mono">{mfaSetup.authenticatorUri}</span></p>
                <div className="flex gap-2 items-center">
                  <input
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\s/g, ''))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    className="bg-black border border-[#292929] rounded px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <ActionBtn label={W['mfa-enable'] ? 'Enabling…' : 'Enable MFA'} onClick={handleMfaEnable} disabled={W['mfa-enable'] || mfaCode.length < 6} />
                </div>
              </div>
            )}
          </div>
        )}
        {msg['mfa-setup'] && <p className="text-green-400 text-xs mt-3">{msg['mfa-setup']}</p>}
        {msg['mfa-enable'] && <p className="text-green-400 text-xs mt-3">{msg['mfa-enable']}</p>}
        {recoveryCodes && (
          <div className="mt-3 border border-yellow-800/60 bg-yellow-950/20 rounded p-3">
            <p className="text-yellow-300 text-xs mb-2">Save these recovery codes now. They will not be shown again.</p>
            <p className="text-yellow-100 text-xs font-mono break-all">{recoveryCodes.join(' · ')}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        <Card title="Watch Embeddings">
          {embStatus && (
            <div className="mb-4 space-y-0.5">
              <Stat label="Total watches" value={embStatus.total} />
              <Stat label="Embedded" value={embStatus.embedded} />
              <Stat label="Coverage" value={`${embStatus.coveragePct.toFixed(1)}%`} />
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
            <ActionBtn label={W['emb'] ? 'Generating…' : 'Generate Missing'} onClick={handleGenerateEmbeddings} disabled={W['emb']} />
            <ActionBtn label={W['emb-regen'] ? 'Regenerating…' : 'Regenerate All'} onClick={handleRegenerateEmbeddings} disabled={W['emb-regen']} danger />
          </div>
        </Card>

        <Card title="Query Cache">
          {cacheStatus && (
            <div className="mb-4 space-y-0.5">
              <Stat label="Total entries" value={cacheStatus.total} />
              <Stat label="Watch Finder" value={cacheStatus.watch_finder} />
              <Stat label="RAG Chat" value={cacheStatus.rag_chat} />
              {cacheStatus.message && <Stat label="Status" value={cacheStatus.message} />}
            </div>
          )}
          {msg['cache-seed'] && <p className="text-green-400 text-xs mb-3">{msg['cache-seed']}</p>}
          {msg['cache-clear'] && <p className="text-green-400 text-xs mb-3">{msg['cache-clear']}</p>}
          <div className="flex gap-2">
            <ActionBtn label={W['cache-seed'] ? 'Seeding…' : 'Seed Queries'} onClick={handleSeedCache} disabled={W['cache-seed']} />
            <ActionBtn label={W['cache-clear'] ? 'Clearing…' : 'Clear Cache'} onClick={handleClearCache} disabled={W['cache-clear']} danger />
          </div>
        </Card>

        <Card title="Image Maintenance">
          <div className="space-y-3">
            <div>
              <p className="text-[#444] text-xs mb-2">Fix legacy image URL references → public IDs</p>
              {msg['img-urls'] && <p className="text-green-400 text-xs mb-2">{msg['img-urls']}</p>}
              <ActionBtn label={W['img-urls'] ? 'Running…' : 'Migrate Image URLs'} onClick={handleMigrateUrls} disabled={W['img-urls']} />
            </div>
            <div className="border-t border-[#111] pt-3">
              <p className="text-[#444] text-xs mb-2">Normalize image filenames to brand+model convention</p>
              {msg['img-names'] && <p className="text-green-400 text-xs mb-2">{msg['img-names']}</p>}
              <ActionBtn label={W['img-names'] ? 'Running…' : 'Normalize Image Names'} onClick={handleNormalizeNames} disabled={W['img-names']} />
            </div>
          </div>
        </Card>

        <Card title="Storage Migration">
          <div className="space-y-3">
            <div>
              <p className="text-[#444] text-xs mb-2">Move all Cloudinary-hosted watch images to S3</p>
              {msg['img-s3'] && <p className="text-green-400 text-xs mb-2">{msg['img-s3']}</p>}
              <ActionBtn label={W['img-s3'] ? 'Migrating…' : 'Migrate to S3'} onClick={handleMigrateS3} disabled={W['img-s3']} danger />
            </div>
            <div className="border-t border-[#111] pt-3">
              <p className="text-[#444] text-xs mb-2">Clean Cloudinary assets with no matching watch record</p>
              {msg['img-orphans-dry'] && <p className="text-green-400 text-xs mb-2">{msg['img-orphans-dry']}</p>}
              {msg['img-orphans'] && <p className="text-green-400 text-xs mb-2">{msg['img-orphans']}</p>}
              <div className="flex gap-2">
                <ActionBtn label={W['img-orphans-dry'] ? 'Running…' : 'Dry Run'} onClick={handleCleanOrphansDry} disabled={W['img-orphans-dry']} />
                <ActionBtn label={W['img-orphans'] ? 'Deleting…' : 'Delete Orphans'} onClick={handleCleanOrphans} disabled={W['img-orphans']} danger />
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
