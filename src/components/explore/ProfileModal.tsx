import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, MessageCircle, Lock, BadgeCheck, Crown, ShieldOff, MapPin, Ruler, Users, Search, Rocket } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/supabaseClient';
import { getPublicProfileGallery, isValidProfileName } from '@/utils/profile';
import { boostUserProfile, sendLikeWithCooldown } from '@/utils/profileInteractions';
import { useProfileDistanceBuckets } from '@/hooks/useProfileDistanceBuckets';

interface ProfileUser {
  id?: string;
  full_name?: string;
  avatar_url?: string;
  public_photos?: string[];
  location?: string;
  age?: string | number;
  isVerified?: boolean;
  isVIP?: boolean;
  status?: string;
  tribe?: string;
  bio?: string;
  height?: string;
  role?: string;
  looking_for?: string;
}

interface Props {
  user: ProfileUser;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  const { t } = useLanguage();
  const { blockUser, blockedUsers, blockListStatus } = useApp();
  const { user: currentUser } = useAuth();
  
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [likeState, setLikeState] = useState<'idle' | 'submitting' | 'sent' | 'cooldown' | 'error'>('idle');
  const [boostState, setBoostState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [interactionMessageIsError, setInteractionMessageIsError] = useState(false);
  const [albumStatus, setAlbumStatus] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<string[]>([]);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [albumMessage, setAlbumMessage] = useState<string | null>(null);
  const publicGallery = getPublicProfileGallery(user.public_photos, user.avatar_url);
  const primaryPhoto = publicGallery[0];
  const displayName = isValidProfileName(user.full_name ?? '') ? user.full_name : '';
  const displayAge = typeof user.age === 'number'
    ? Number.isFinite(user.age) && user.age > 0 ? String(user.age) : undefined
    : typeof user.age === 'string' && user.age.trim().length > 0 ? user.age.trim() : undefined;
  const status = typeof user.status === 'string' && user.status.trim().length > 0 ? user.status.trim() : undefined;
  const tribe = typeof user.tribe === 'string' && user.tribe.trim().length > 0 ? user.tribe.trim() : undefined;
  const bio = typeof user.bio === 'string' && user.bio.trim().length > 0 ? user.bio.trim() : undefined;
  const location = typeof user.location === 'string' && user.location.trim().length > 0 ? user.location.trim() : undefined;
  const profileDetails = [
    { icon: Ruler, label: t('profile.height', '身高'), value: user.height },
    { icon: Users, label: t('profile.role', '角色'), value: user.role },
    { icon: Search, label: t('profile.lookingFor', '尋找'), value: user.looking_for },
  ].filter((detail): detail is { icon: typeof Ruler; label: string; value: string } => (
    typeof detail.value === 'string' && detail.value.trim().length > 0
  ));
  const targetId = user.id ?? null;
  const hasInteractionTarget = Boolean(targetId && currentUser?.id && targetId !== currentUser.id);
  const isBlocked = Boolean(targetId && blockedUsers.has(targetId));
  const interactionUnavailable = !hasInteractionTarget || isBlocked || blockListStatus !== 'ready';
  const distanceBucketsByProfileId = useProfileDistanceBuckets(hasInteractionTarget && targetId ? [targetId] : []);
  const distanceBucket = targetId ? distanceBucketsByProfileId[targetId] : undefined;

  useEffect(() => {
    if (!targetId || !currentUser?.id || targetId === currentUser.id) return;
    let current = true;
    void supabase.rpc('get_private_album_request_status', { target_profile_id: targetId })
      .then(({ data, error }) => {
        if (!current) return;
        if (error) {
          setAlbumStatus(null);
          setAlbumMessage('私密相簿目前無法使用。');
          return;
        }
        setAlbumStatus(typeof data === 'string' ? data : null);
      });
    return () => { current = false; };
  }, [currentUser?.id, targetId]);

  async function handleAlbumRequest() {
    if (!targetId || !currentUser?.id || targetId === currentUser.id || albumLoading) return;
    setAlbumLoading(true);
    setAlbumMessage(null);
    try {
      const { data, error } = await supabase.rpc('request_private_album', { target_profile_id: targetId });
      if (error) throw error;
      const nextStatus = typeof data === 'string' ? data : null;
      setAlbumStatus(nextStatus);
      setAlbumMessage(nextStatus === 'pending' ? '已送出相簿存取申請。' : nextStatus === 'approved' ? '你已獲准查看此相簿。' : '目前無法重新申請。');
    } catch (error) {
      console.error('私密相簿申請失敗:', error);
      setAlbumMessage('私密相簿目前無法使用。');
    } finally {
      setAlbumLoading(false);
    }
  }

  async function handleLoadAlbum() {
    if (!targetId || !currentUser?.id || albumLoading) return;
    setAlbumLoading(true);
    setAlbumMessage(null);
    try {
      const { data, error } = await supabase.rpc('get_authorized_private_photos', { target_profile_id: targetId });
      if (error) throw error;
      setAlbumPhotos(Array.isArray(data) ? data.filter((photo): photo is string => typeof photo === 'string') : []);
    } catch (error) {
      console.error('載入私密相簿失敗:', error);
      setAlbumMessage('私密相簿目前無法使用。');
    } finally {
      setAlbumLoading(false);
    }
  }

  async function handleBlock() {
    if (!user?.id || !currentUser?.id) return;
    if (user.id === currentUser.id) {
      alert('你無法封鎖自己。');
      return;
    }
    try {
      await blockUser(user.id);
      onClose();
    } catch (error) {
      console.error('封鎖失敗:', error);
      alert('封鎖失敗，請稍後再試。');
    }
  }

  async function handleLike() {
    if (!targetId || !currentUser?.id) {
      setInteractionMessage('請先登入後再傳送心動。');
      setInteractionMessageIsError(true);
      return;
    }
    if (targetId === currentUser.id) {
      setInteractionMessage('你無法對自己傳送心動。');
      setInteractionMessageIsError(true);
      return;
    }
    if (blockListStatus !== 'ready') {
      setInteractionMessage('正在確認封鎖名單，暫時無法互動。');
      setInteractionMessageIsError(true);
      return;
    }
    if (blockedUsers.has(targetId)) {
      setInteractionMessage('你已封鎖此使用者，無法互動。');
      setInteractionMessageIsError(true);
      return;
    }

    setLikeState('submitting');
    setInteractionMessage(null);
    setInteractionMessageIsError(false);
    try {
      const result = await sendLikeWithCooldown(targetId);
      if (result === 'in-flight') {
        setLikeState('idle');
        setInteractionMessage('心動正在送出，請稍候。');
        setInteractionMessageIsError(false);
        return;
      }
      if (result === 'cooldown') {
        setLikeState('cooldown');
        setInteractionMessage('你最近已傳送過心動，請 24 小時後再試。');
        setInteractionMessageIsError(false);
        return;
      }
      setLikeState('sent');
      setInteractionMessage('心動已送出。');
      setInteractionMessageIsError(false);
    } catch (error) {
      console.error('傳送心動失敗:', error);
      setLikeState('error');
      setInteractionMessage('無法傳送心動，請稍後再試。');
      setInteractionMessageIsError(true);
    }
  }

  async function handleBoost() {
    if (!targetId || !currentUser?.id) {
      setInteractionMessage('請先登入後再推送。');
      setInteractionMessageIsError(true);
      return;
    }
    if (targetId === currentUser.id) {
      setInteractionMessage('你無法推送自己的個人檔案。');
      setInteractionMessageIsError(true);
      return;
    }
    if (blockListStatus !== 'ready') {
      setInteractionMessage('正在確認封鎖名單，暫時無法互動。');
      setInteractionMessageIsError(true);
      return;
    }
    if (blockedUsers.has(targetId)) {
      setInteractionMessage('你已封鎖此使用者，無法互動。');
      setInteractionMessageIsError(true);
      return;
    }

    setBoostState('submitting');
    setInteractionMessage(null);
    setInteractionMessageIsError(false);
    try {
      const wasSubmitted = await boostUserProfile(targetId);
      if (!wasSubmitted) {
        setBoostState('idle');
        setInteractionMessage('推送正在送出，請稍候。');
        setInteractionMessageIsError(false);
        return;
      }
      setBoostState('sent');
      setInteractionMessage('推送已送出。');
      setInteractionMessageIsError(false);
    } catch (error) {
      console.error('推送失敗:', error);
      setBoostState('error');
      setInteractionMessage('無法推送，請稍後再試。');
      setInteractionMessageIsError(true);
    }
  }

  function handleMessage() {
    window.dispatchEvent(new CustomEvent('jump-to-chat', { detail: user }));
    onClose();
  }

  const getInitials = (name?: string) => name ? name.substring(0, 2).toUpperCase() : '??';
  const getGradient = (id: string = '') => {
    const gradients = ['from-blue-600 to-violet-600', 'from-orange-500 to-red-600', 'from-emerald-500 to-teal-700', 'from-pink-500 to-rose-600'];
    const charCode = id ? id.charCodeAt(0) : 0;
    return gradients[charCode % gradients.length];
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-end justify-center pointer-events-auto">
      <div className="w-full max-w-md bg-slate-950 rounded-t-3xl border border-white/10 shadow-2xl shadow-violet-500/10 flex flex-col overflow-hidden relative"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards', maxHeight: '90vh' }}>
        
        <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden pb-4" style={{ scrollbarWidth: 'none' }}>
          <div className="relative">
            {primaryPhoto ? (
              <div className="h-64 relative">
                <img src={primaryPhoto} alt={displayName} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent" />
              </div>
            ) : (
              <div className={`h-64 bg-gradient-to-br ${getGradient(user?.id)} flex items-center justify-center relative`}>
                <span className="text-white font-black text-6xl drop-shadow-xl opacity-80 mix-blend-overlay">
                  {getInitials(displayName)}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent" />
              </div>
            )}

            <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
              <button onClick={onClose} className="w-9 h-9 bg-slate-950/60 backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-slate-900 transition-all pointer-events-auto border border-white/10">
                <X className="w-4 h-4 text-white"/>
              </button>
              <button onClick={() => setShowBlockConfirm(true)} className="flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-xl border border-red-500/30 rounded-full px-3 py-1.5 hover:bg-red-950/60 transition-all pointer-events-auto">
                <ShieldOff className="w-3.5 h-3.5 text-red-400"/>
                <span className="text-red-400 text-xs font-medium">{t('block.action', '封鎖')}</span>
              </button>
            </div>
          </div>
          
          <div className="px-5 pt-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white text-xl font-bold">{displayName || t('common.unknownName', '尚未設定名稱')}</h2>
                  {displayAge && <><span className="text-white/40">,</span><span className="text-white/60 text-lg">{displayAge}</span></>}
                  {user?.isVerified && <BadgeCheck className="w-5 h-5 text-cyan-400"/>}
                  {user?.isVIP && <Crown className="w-4 h-4 text-amber-500"/>}
                </div>
                {(status || tribe) && <div className="flex items-center gap-2 mt-1">
                  {status && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/8 text-white/60">{status}</span>}
                  {tribe && <span className="text-white/30 text-xs capitalize">{tribe}</span>}
                </div>}
                {location && <div className="mt-2 flex items-center gap-1 text-xs text-white/50">
                  <MapPin className="h-3 w-3 text-violet-300" />
                  <span>{location}</span>
                </div>}
                {distanceBucket && <div className="mt-1 flex items-center gap-1 text-xs text-violet-200">
                  <MapPin className="h-3 w-3 text-violet-300" />
                  <span>{distanceBucket}</span>
                </div>}
              </div>
            </div>

            <p className="text-white/65 text-sm leading-relaxed">{bio ?? t('common.noBio', '尚未填寫自我介紹')}</p>

            {profileDetails.length > 0 && <div className={`grid gap-2 ${profileDetails.length === 1 ? 'grid-cols-1' : profileDetails.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {profileDetails.map((detail) => {
                const Icon = detail.icon;
                return (
                  <div key={detail.label} className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
                    <Icon className="w-4 h-4 text-white/30 mx-auto mb-1"/>
                    <p className="text-white/80 text-xs font-semibold">{detail.value}</p>
                    <p className="text-white/30 text-[10px]">{detail.label}</p>
                  </div>
                );
              })}
            </div>}

            {publicGallery.length > 1 && <div className="grid grid-cols-3 gap-2">
              {publicGallery.slice(1).map((photo, index) => (
                <img key={photo} src={photo} alt={`${displayName || t('profile.title', '個人檔案')} ${index + 2}`} className="aspect-square w-full rounded-xl object-cover border border-white/10" />
              ))}
            </div>}

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-500"/>
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-sm font-semibold">{t('album.title', '私密相簿')}</p>
                <p className="text-white/40 text-xs">{albumStatus === 'pending' ? t('album.pending', '申請等待對方回覆') : albumStatus === 'approved' ? t('album.approved', '已獲得存取權') : albumStatus === 'rejected' ? t('album.rejected', '目前無法存取') : t('album.available', '可向對方申請存取')}</p>
              </div>
              {albumStatus === 'approved' ? <button onClick={() => void handleLoadAlbum()} disabled={albumLoading} className="text-amber-300 text-xs disabled:opacity-50">{t('album.view', '查看')}</button> : <button onClick={() => void handleAlbumRequest()} disabled={albumLoading || !hasInteractionTarget} className="text-amber-300 text-xs disabled:opacity-50">{albumLoading ? t('album.processing', '處理中') : t('album.request', '申請')}</button>}
            </div>
            {albumMessage && <p className="text-xs text-amber-200" role="status">{albumMessage}</p>}
            {albumPhotos.length > 0 && <div className="grid grid-cols-3 gap-2">{albumPhotos.map((photo) => <img key={photo} src={photo} alt="已授權私密照片" className="aspect-square w-full rounded-xl object-cover" />)}</div>}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 shrink-0 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <div className="flex gap-2">
            <button
              onClick={handleLike}
              disabled={interactionUnavailable || likeState === 'submitting' || likeState === 'sent' || likeState === 'cooldown'}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-semibold text-xs transition-all duration-200 pointer-events-auto transform ${interactionUnavailable || likeState === 'submitting' || likeState === 'sent' || likeState === 'cooldown' ? 'opacity-50 cursor-not-allowed scale-[0.98]' : 'hover:scale-[1.02] active:scale-95'} bg-pink-500/20 border border-pink-500/40 text-pink-400 shadow-lg shadow-pink-500/10`}
            >
              {likeState === 'sent' || likeState === 'cooldown' ? <Heart className="w-5 h-5 transition-all duration-200 fill-pink-400 scale-110" /> : <Heart className="w-5 h-5 transition-all duration-200" />}
              {likeState === 'submitting' ? t('interaction.sending', '傳送中') : likeState === 'sent' ? t('interaction.sent', '已發送') : likeState === 'cooldown' ? t('interaction.cooldown', '冷卻中') : t('interaction.like', '心動')}
            </button>
            <button
              onClick={handleBoost}
              disabled={interactionUnavailable || boostState === 'submitting' || boostState === 'sent'}
              className={`flex-[1.2] flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-2xl font-bold text-xs transition-all duration-200 shadow-lg shadow-orange-500/20 border border-amber-300/30 pointer-events-auto ${interactionUnavailable || boostState === 'submitting' || boostState === 'sent' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
            >
              <Rocket className="w-5 h-5 transition-all duration-200" />
              {boostState === 'submitting' ? t('interaction.boosting', '推送中') : boostState === 'sent' ? t('interaction.boosted', '已推送') : t('interaction.boost', '推送')}
            </button>
            <button onClick={handleMessage} className="flex-1 flex flex-col items-center justify-center gap-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 py-3 rounded-2xl font-semibold text-xs transition-all duration-200 hover:scale-[1.02] active:scale-95 pointer-events-auto">
              <MessageCircle className="w-5 h-5"/>
              Message
            </button>
          </div>
          {interactionMessage && (
            <p className={`mt-2 text-center text-xs ${interactionMessageIsError ? 'text-rose-300' : 'text-white/60'}`} role="status" aria-live="polite">
              {interactionMessage}
            </p>
          )}
        </div>

        {showBlockConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 z-[70] pointer-events-auto">
            <div className="bg-slate-950 border border-red-500/30 rounded-2xl p-6 w-full max-w-xs text-center shadow-lg shadow-red-500/20">
              <ShieldOff className="w-10 h-10 text-red-400 mx-auto mb-3"/>
              <h3 className="text-white font-bold mb-2">{t('block.confirmTitle', '封鎖此使用者？')}</h3>
              <p className="text-white/50 text-xs mb-5">{t('block.confirmHint', '對方將無法看到您的個人檔案或聯繫您。')}</p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowBlockConfirm(false)} className="flex-1 bg-white/8 border border-white/10 text-white/70 py-2.5 rounded-xl text-sm font-medium hover:bg-white/12">{t('common.cancel', '取消')}</button>
                <button onClick={handleBlock} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-500/20">{t('block.confirm', '確認封鎖')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
