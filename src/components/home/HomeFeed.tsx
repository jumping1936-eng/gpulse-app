import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Crown, Heart, MapPin, MessageCircle, Rocket, Sparkles } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import ProfileModal from '@/components/explore/ProfileModal';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getPublicProfilePhoto, isValidProfileName, PUBLIC_PROFILE_FIELDS } from '@/utils/profile';
import { boostUserProfile, sendLikeWithCooldown } from '@/utils/profileInteractions';
import { DistanceBucket, useProfileDistanceBuckets } from '@/hooks/useProfileDistanceBuckets';
import GPulseLogo from '@/components/brand/GPulseLogo';

interface ProfileRecord {
  id: string;
  full_name: string;
  age: number | null;
  avatar_url: string;
  public_photos: string[];
  location: string;
  is_vip: boolean;
  bio: string;
  tribe?: string;
  height?: number;
  role?: string[];
  looking_for?: string[];
}

interface NearbyUser {
  id: string;
  name: string;
  age: number | null;
  avatar: string;
  location: string;
  isVIP: boolean;
  isOnline: boolean;
  accent: string;
  distanceBucket?: DistanceBucket;
}

interface Recommendation {
  id: string;
  name: string;
  age: number | null;
  avatar: string;
  location: string;
  bio: string;
  isVIP: boolean;
  isOnline: boolean;
  distanceBucket?: DistanceBucket;
}

interface InteractionFeedback {
  message: string;
  tone: 'error' | 'info';
}


const normalizeProfiles = (records: Array<Record<string, unknown> | ProfileRecord>): ProfileRecord[] => {
  const safeRecords = Array.isArray(records) ? records : [];
  return safeRecords.flatMap((profile) => {
    const raw = profile as Record<string, unknown>;
    const id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id : null;
    if (!id) return [];

    const rawProfileName = typeof raw.full_name === 'string' ? raw.full_name : '';
    const profileName = isValidProfileName(rawProfileName) ? rawProfileName : '';

    const rawAge = Number(raw.age);
    const age = Number.isFinite(rawAge) && rawAge > 0 ? rawAge : null;
    const avatar = typeof raw.avatar_url === 'string' ? raw.avatar_url : '';
    const publicPhotos = Array.isArray(raw.public_photos)
      ? raw.public_photos.filter((item): item is string => typeof item === 'string')
      : [];
    const location = typeof raw.location === 'string' ? raw.location.trim() : '';
    const bio = typeof raw.bio === 'string' && raw.bio.trim().length > 0
      ? raw.bio
      : '';
    const tribe = typeof raw.tribe === 'string' ? raw.tribe : undefined;

    const rawHeight = Number(raw.height);
    const height = Number.isFinite(rawHeight) ? rawHeight : undefined;

    let role: string[] | undefined;
    if (Array.isArray(raw.role)) {
      role = raw.role.filter((item): item is string => typeof item === 'string');
    } else if (typeof raw.role === 'string' && raw.role.trim().length > 0) {
      role = raw.role.split(',').map((item) => item.trim()).filter(Boolean);
    }

    let lookingFor: string[] | undefined;
    if (Array.isArray(raw.looking_for)) {
      lookingFor = raw.looking_for.filter((item): item is string => typeof item === 'string');
    } else if (typeof raw.looking_for === 'string' && raw.looking_for.trim().length > 0) {
      lookingFor = raw.looking_for.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return {
      id,
      full_name: profileName,
      age,
      avatar_url: avatar,
      public_photos: publicPhotos,
      location,
      is_vip: raw.is_vip === true,
      bio,
      tribe,
      height,
      role,
      looking_for: lookingFor,
    };
  });
};

export default function HomeFeed() {
  const { blockedUsers, blockListStatus } = useApp();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vip'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);
  const [likeStates, setLikeStates] = useState<Record<string, 'idle' | 'submitting' | 'sent' | 'cooldown' | 'error'>>({});
  const [boostStates, setBoostStates] = useState<Record<string, 'idle' | 'submitting' | 'sent' | 'error'>>({});
  const [interactionFeedback, setInteractionFeedback] = useState<Record<string, InteractionFeedback>>({});
  const [messagedIds, setMessagedIds] = useState<string[]>([]);
  const [actionTimestamps, setActionTimestamps] = useState<Record<string, number>>({});

  const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

  const openProfile = (userId: string) => {
    const nextProfile = visibleUsers.find((user) => user.id === userId) ?? null;
    if (!nextProfile) return;
    setSelectedUserId(userId);
    setSelectedProfile(nextProfile);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProfiles = async () => {
      try {
        setIsLoading(true);

        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select(PUBLIC_PROFILE_FIELDS);

        if (supabaseError) {
          throw supabaseError;
        }

        const nextUsers = normalizeProfiles(Array.isArray(data) ? data : []);

        if (isMounted) {
          setUsers(nextUsers);
          setFetchError(null);
        }
      } catch (err) {
        console.error('HomeFeed fetch profiles failed:', err);
        if (isMounted) {
          setUsers([]);
          setFetchError('目前無法載入使用者資料，請稍後再試。');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfiles();
    window.addEventListener('gpulse-profile-updated', fetchProfiles);

    return () => {
      isMounted = false;
      window.removeEventListener('gpulse-profile-updated', fetchProfiles);
    };
  }, []);

  const visibleUsers = useMemo(() => {
    if (blockListStatus !== 'ready') return [];
    return users.filter((profile) => !blockedUsers.has(profile.id));
  }, [blockListStatus, blockedUsers, users]);

  const visibleProfileIds = useMemo(() => visibleUsers.map((profile) => profile.id), [visibleUsers]);
  const distanceBucketsByProfileId = useProfileDistanceBuckets(visibleProfileIds);

  useEffect(() => {
    if (selectedProfile && !visibleUsers.some((profile) => profile.id === selectedProfile.id)) {
      setSelectedProfile(null);
    }
  }, [selectedProfile, visibleUsers]);

  const nearbyUsers = useMemo<NearbyUser[]>(() => {
    const source = visibleUsers;

    return source.slice(0, 5).map((user) => ({
      id: user.id,
      name: user.full_name,
      age: user.age,
      avatar: getPublicProfilePhoto(user.public_photos, user.avatar_url) ?? '',
      location: user.location,
      isVIP: user.is_vip,
      isOnline: false,
      accent: ['from-violet-500 to-blue-500', 'from-cyan-500 to-sky-500', 'from-amber-500 to-orange-500', 'from-pink-500 to-rose-500', 'from-emerald-500 to-teal-500'][user.id.charCodeAt(0) % 5],
      distanceBucket: distanceBucketsByProfileId[user.id],
    }));
  }, [distanceBucketsByProfileId, visibleUsers]);

  const recommendations = useMemo<Recommendation[]>(() => {
    const source = visibleUsers;

    return source.slice(5).map((user) => {
      return {
        id: user.id,
        name: user.full_name,
        age: user.age,
        avatar: getPublicProfilePhoto(user.public_photos, user.avatar_url) ?? '',
        location: user.location,
        bio: user.bio,
        isVIP: user.is_vip,
        isOnline: false,
        distanceBucket: distanceBucketsByProfileId[user.id],
      };
    });
  }, [distanceBucketsByProfileId, visibleUsers]);

  const filteredRecommendations = useMemo(() => {
    const items = [...recommendations];

    const result = items.filter((item) => {
      if (selectedFilter === 'vip') return item.isVIP;
      return true;
    });

    result.sort((a, b) => {
      if (a.isVIP !== b.isVIP) return a.isVIP ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [recommendations, selectedFilter]);

  useEffect(() => {
    if (!filteredRecommendations.length) return;
    setSelectedUserId((prev) => prev ?? filteredRecommendations[0].id);
  }, [filteredRecommendations]);

  const isWithin24Hours = (id: string, type: 'message') => {
    const key = `${type}:${id}`;
    const lastAt = actionTimestamps[key];
    if (!lastAt) return false;
    return Date.now() - lastAt < TWENTY_FOUR_HOURS;
  };

  const canInteractWith = (targetId: string) => (
    Boolean(currentUser?.id)
    && currentUser.id !== targetId
    && blockListStatus === 'ready'
    && !blockedUsers.has(targetId)
  );

  const handleLike = async (item: Recommendation) => {
    if (!canInteractWith(item.id)) {
      setInteractionFeedback((previous) => ({ ...previous, [item.id]: { message: '目前無法安全傳送心動。', tone: 'error' } }));
      return;
    }

    setLikeStates((previous) => ({ ...previous, [item.id]: 'submitting' }));
    setInteractionFeedback((previous) => {
      const nextFeedback = { ...previous };
      delete nextFeedback[item.id];
      return nextFeedback;
    });

    try {
      const result = await sendLikeWithCooldown(item.id);
      if (result === 'in-flight') {
        setLikeStates((previous) => ({ ...previous, [item.id]: 'idle' }));
        setInteractionFeedback((previous) => ({ ...previous, [item.id]: { message: '心動正在送出，請稍候。', tone: 'info' } }));
        return;
      }
      setLikeStates((previous) => ({ ...previous, [item.id]: result === 'sent' ? 'sent' : 'cooldown' }));
      if (result === 'cooldown') {
        setInteractionFeedback((previous) => ({ ...previous, [item.id]: { message: '你最近已傳送過心動，請 24 小時後再試。', tone: 'info' } }));
      }
    } catch (error) {
      console.error('HomeFeed 傳送心動失敗:', error);
      setLikeStates((previous) => ({ ...previous, [item.id]: 'error' }));
      setInteractionFeedback((previous) => ({ ...previous, [item.id]: { message: '無法傳送心動，請稍後再試。', tone: 'error' } }));
    }
  };

  const handleBoost = async (item: Recommendation) => {
    if (!canInteractWith(item.id)) {
      setInteractionFeedback((previous) => ({ ...previous, [item.id]: { message: '目前無法安全推送。', tone: 'error' } }));
      return;
    }

    setBoostStates((previous) => ({ ...previous, [item.id]: 'submitting' }));
    setInteractionFeedback((previous) => {
      const nextFeedback = { ...previous };
      delete nextFeedback[item.id];
      return nextFeedback;
    });

    try {
      const wasSubmitted = await boostUserProfile(item.id);
      if (!wasSubmitted) {
        setBoostStates((previous) => ({ ...previous, [item.id]: 'idle' }));
        setInteractionFeedback((previous) => ({ ...previous, [item.id]: { message: '推送正在送出，請稍候。', tone: 'info' } }));
        return;
      }
      setBoostStates((previous) => ({ ...previous, [item.id]: 'sent' }));
    } catch (error) {
      console.error('HomeFeed 推送失敗:', error);
      setBoostStates((previous) => ({ ...previous, [item.id]: 'error' }));
      setInteractionFeedback((previous) => ({ ...previous, [item.id]: { message: '無法推送，請稍後再試。', tone: 'error' } }));
    }
  };

  const handleMessage = (item: Recommendation) => {
    const type = 'message';
    const key = `${type}:${item.id}`;
    if (isWithin24Hours(item.id, type)) {
      alert('訊息已在 24 小時內使用過，請稍後再試。');
      return;
    }

    setMessagedIds((prev) => [...new Set([...prev, item.id])]);

    setActionTimestamps((prev) => ({ ...prev, [key]: Date.now() }));

    setSelectedUserId(item.id);
    const targetUser = {
      id: item.id,
      full_name: item.name,
      avatar_url: item.avatar,
      age: item.age,
      bio: item.bio,
      other_user: {
        id: item.id,
        full_name: item.name,
        avatar_url: item.avatar,
        bio: item.bio,
      },
    };
    window.dispatchEvent(new CustomEvent('jump-to-chat', { detail: targetUser }));
  };

  const selectedUser = filteredRecommendations.find((item) => item.id === selectedUserId) ?? filteredRecommendations[0] ?? null;

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-white">
      <div className="px-4 pb-28 pt-4">
        {!isLoading && fetchError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/40">
            <Sparkles className="w-12 h-12 text-rose-400/50" />
            <p className="text-sm font-medium text-rose-200">{fetchError}</p>
          </div>
        )}

        {!isLoading && !fetchError && blockListStatus === 'ready' && visibleUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/40">
            <Sparkles className="w-12 h-12 text-violet-400/40" />
            <p className="text-sm font-medium">{t('home.noUsers', '目前還沒有其他使用者')}</p>
            <p className="text-xs text-white/25">{t('home.emptyHint', '邀請朋友加入，或稍後再回來看看')}</p>
          </div>
        )}

        {!isLoading && !fetchError && blockListStatus === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/40">
            <Sparkles className="w-8 h-8 text-violet-400/40 animate-pulse" />
            <p className="text-sm">{t('home.blockLoading', '正在確認封鎖名單…')}</p>
          </div>
        )}

        {!isLoading && !fetchError && (blockListStatus === 'error' || blockListStatus === 'unauthenticated') && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-rose-200/80">
            <Sparkles className="w-8 h-8 text-rose-400/50" />
            <p className="text-sm">{t('home.blockUnavailable', '目前無法安全載入探索名單，請稍後再試。')}</p>
          </div>
        )}

        <header className="mb-5 flex items-center justify-between">
          <div>
            <GPulseLogo size="sm" glow="none" />
            <h1 className="mt-1 text-2xl font-black tracking-tight">Home</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-xl transition hover:bg-white/10"
              aria-label={t('common.backToTop', '回到頁首')}
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25"
              aria-label={t('common.backToTop', '回到頁首')}
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/70">Discover</p>
            <h2 className="text-lg font-bold text-white">{t('home.discover', '探索使用者')}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className="flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200"
            >
              {t('home.viewAll', '查看全部')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`nearby-skeleton-${index}`} className="min-w-[120px] rounded-[22px] border border-white/5 bg-slate-900/80 p-2 shadow-lg shadow-slate-950/30 backdrop-blur-xl">
                  <div className="h-32 w-full rounded-[18px] bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="h-3 w-12 rounded-full bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                    <div className="h-3 w-10 rounded-full bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {nearbyUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => openProfile(user.id)}
                  className={`group relative min-w-[120px] overflow-hidden rounded-[22px] border p-2 text-left shadow-lg shadow-slate-950/40 backdrop-blur-xl transition hover:-translate-y-0.5 ${selectedUserId === user.id ? 'border-violet-500/70 shadow-violet-500/15' : 'border-white/10 hover:border-violet-500/50'}`}
                >
                  <div className={`relative overflow-hidden rounded-[18px] bg-gradient-to-br ${user.accent} p-[1px]`}>
                    <div className="relative overflow-hidden rounded-[17px]">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-32 w-full object-cover" />
                      ) : (
                        <div className="h-32 w-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{user.name?.slice(0, 2).toUpperCase() || '??'}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                      {user.isVIP && (
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                          <Crown className="h-3 w-3" />
                          VIP
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold leading-none text-white">{isValidProfileName(user.name) ? user.name : t('common.unknownName', '尚未設定名稱')}</p>
                          {user.age && <p className="mt-1 text-[10px] text-white/80">{user.age}</p>}
                        </div>
                        {user.isOnline && <div className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-slate-950/60 px-1.5 py-1 text-[9px] text-emerald-300 backdrop-blur-xl">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          online
                        </div>}
                      </div>
                    </div>
                  </div>

                  {user.location && <div className="mt-2 flex items-center justify-between text-[10px] text-slate-300">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-violet-300" />
                      {user.location}
                    </span>
                  </div>}
                  {user.distanceBucket && <div className="mt-1 flex items-center gap-1 text-[10px] text-violet-200">
                    <MapPin className="h-3 w-3 text-violet-300" />
                    {user.distanceBucket}
                  </div>}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">For You</p>
              <h2 className="text-lg font-bold text-white">{t('home.latest', '系統最新推薦')}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFilter('vip')}
              className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 shadow-lg shadow-orange-500/20"
            >
              {t('home.featured', '今日精選')}
            </button>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'all', label: t('home.all', '全部') },
              { id: 'vip', label: t('home.vip', 'VIP') },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedFilter(filter.id as 'all' | 'vip')}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                  selectedFilter === filter.id
                    ? 'border-violet-500/60 bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-violet-500/40 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {selectedUser && (
            <div className="mb-4 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-3 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70">Selected</p>
                  <p className="mt-1 text-sm font-bold text-white">{t('home.selected', '正在關注')} {selectedUser.name}</p>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`recommendation-skeleton-${index}`} className="overflow-hidden rounded-[24px] border border-white/5 bg-slate-900/80 shadow-lg shadow-slate-950/40 backdrop-blur-xl">
                  <div className="h-48 w-full bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                  <div className="space-y-3 p-3">
                    <div className="h-4 w-20 rounded-full bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                    <div className="h-3 w-16 rounded-full bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                    <div className="h-3 w-full rounded-full bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                    <div className="h-3 w-4/5 rounded-full bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="columns-2 gap-3">
              {filteredRecommendations.map((item) => {
                const likeState = likeStates[item.id] ?? 'idle';
                const boostState = boostStates[item.id] ?? 'idle';
                const isMessaged = messagedIds.includes(item.id);
                const messageCooldown = isWithin24Hours(item.id, 'message');
                const interactionDisabled = !canInteractWith(item.id);
                const likeDisabled = interactionDisabled || likeState === 'submitting' || likeState === 'sent' || likeState === 'cooldown';
                const boostDisabled = interactionDisabled || boostState === 'submitting' || boostState === 'sent';

                return (
                  <article
                    key={item.id}
                    onClick={() => openProfile(item.id)}
                    className={`mb-3 inline-block w-full cursor-pointer overflow-hidden rounded-[24px] border bg-slate-900/80 shadow-lg shadow-slate-950/40 backdrop-blur-xl break-inside-avoid transition hover:-translate-y-0.5 ${selectedUserId === item.id ? 'border-violet-500/60 shadow-violet-500/10' : 'border-white/10'}`}
                  >
                    <div className="relative overflow-hidden rounded-t-[23px]">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.name} className="h-48 w-full object-cover" />
                      ) : (
                        <div className="h-48 w-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">{item.name?.slice(0, 2).toUpperCase() || '??'}</span>
                        </div>
                      )}
                      {item.isVIP && (
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                          <Crown className="h-3 w-3" />
                          VIP
                        </div>
                      )}
                      {item.isOnline && <div className="absolute bottom-2 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-950/80 bg-emerald-400 shadow-[0_0_0_2px_rgba(15,23,42,0.8)]" title="online" />}
                    </div>

                    <div className="space-y-3 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-bold text-white">{isValidProfileName(item.name) ? item.name : t('common.unknownName', '尚未設定名稱')}{item.age ? `, ${item.age}` : ''}</h3>
                            {item.isVIP && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                          </div>
                          {item.location && <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-300">
                            <MapPin className="h-3 w-3 text-violet-300" />
                            {item.location}
                          </div>}
                          {item.distanceBucket && <div className="mt-1 flex items-center gap-1 text-[10px] text-violet-200">
                            <MapPin className="h-3 w-3 text-violet-300" />
                            {item.distanceBucket}
                          </div>}
                        </div>
                      </div>

                      {item.bio && <p className="text-[11px] leading-5 text-slate-300">{item.bio}</p>}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={likeDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleLike(item);
                          }}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-[11px] font-semibold transition ${likeDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${
                            likeState === 'sent' || likeState === 'cooldown'
                              ? 'bg-white/10 text-violet-200 border border-violet-500/30'
                              : 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20'
                          }`}
                        >
                          {likeState === 'sent' || likeState === 'cooldown' ? <Check className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
                          {likeState === 'submitting' ? '傳送中' : likeState === 'sent' ? '已心動' : likeState === 'cooldown' ? '冷卻中' : '心動'}
                        </button>

                        <button
                          type="button"
                          disabled={boostDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleBoost(item);
                          }}
                          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${boostDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${
                            boostState === 'sent'
                              ? 'border border-amber-500/40 bg-amber-500/20 text-amber-200'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/20'
                          }`}
                          aria-label={`Boost ${item.name}`}
                        >
                          {boostState === 'sent' ? <Check className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessage(item);
                          }}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                            isMessaged || messageCooldown
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                          }`}
                          aria-label={`Message ${item.name}`}
                        >
                          {isMessaged || messageCooldown ? <Check className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                        </button>
                      </div>
                      {interactionFeedback[item.id] && (
                        <p className={`text-[10px] leading-4 ${interactionFeedback[item.id].tone === 'error' ? 'text-rose-200' : 'text-white/60'}`} role="status" aria-live="polite">
                          {interactionFeedback[item.id].message}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedProfile && (
        <ProfileModal
          user={{
            id: selectedProfile.id,
            full_name: selectedProfile.full_name,
            avatar_url: selectedProfile.avatar_url,
            public_photos: selectedProfile.public_photos,
            location: selectedProfile.location || undefined,
            age: selectedProfile.age,
            isVIP: selectedProfile.is_vip,
            isVerified: selectedProfile.is_vip,
            bio: selectedProfile.bio,
            tribe: selectedProfile.tribe,
            height: selectedProfile.height ? `${selectedProfile.height}` : undefined,
            role: Array.isArray(selectedProfile.role) ? selectedProfile.role.join(', ') : selectedProfile.role,
            looking_for: Array.isArray(selectedProfile.looking_for) ? selectedProfile.looking_for.join(', ') : selectedProfile.looking_for,
          }}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}
