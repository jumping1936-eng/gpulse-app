import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';

type Relationship = { requester_id: string; status: 'pending' | 'approved'; created_at: string; updated_at: string };

export default function PrivateAlbumRelationships() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Relationship[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = React.useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('list_own_private_album_relationships');
    if (rpcError) { setError(t('album.relationshipLoadError', '無法載入私密相簿申請。')); return; }
    setItems((data ?? []) as Relationship[]); setError(null);
  }, [t]);
  useEffect(() => { void load(); }, [load]);
  const respond = async (requesterId: string, approve: boolean) => {
    setBusyId(requesterId);
    const { error: rpcError } = await supabase.rpc('respond_private_album_request', { requester_profile_id: requesterId, approve });
    if (rpcError) setError(t('album.relationshipUpdateError', '無法更新申請，請稍後再試。')); else await load();
    setBusyId(null);
  };
  const revoke = async (requesterId: string) => {
    setBusyId(requesterId);
    const { error: rpcError } = await supabase.rpc('revoke_private_album_access', { requester_profile_id: requesterId });
    if (rpcError) setError(t('album.relationshipRevokeError', '無法撤銷存取權，請稍後再試。')); else await load();
    setBusyId(null);
  };
  if (items.length === 0 && !error) return null;
  return <section className="mx-4 mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-white">
    <h2 className="font-semibold">{t('album.manageTitle', '私密相簿存取管理')}</h2>
    {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    {items.map((item) => <div key={item.requester_id} className="mt-3 flex items-center justify-between gap-2 text-xs">
      <span className="text-white/70">{t('album.requester', '申請者')} {item.requester_id.slice(0, 8)}… ({item.status === 'pending' ? t('album.statusPending', '等待回覆') : t('album.statusApproved', '已獲准')})</span>
      {item.status === 'pending' ? <span className="flex gap-2"><button disabled={busyId === item.requester_id} onClick={() => void respond(item.requester_id, true)} className="text-emerald-300 disabled:opacity-50">{t('album.approve', '同意')}</button><button disabled={busyId === item.requester_id} onClick={() => void respond(item.requester_id, false)} className="text-rose-300 disabled:opacity-50">{t('album.reject', '拒絕')}</button></span> : <button disabled={busyId === item.requester_id} onClick={() => void revoke(item.requester_id)} className="text-amber-300 disabled:opacity-50">{t('album.revoke', '撤銷')}</button>}
    </div>)}
  </section>;
}
