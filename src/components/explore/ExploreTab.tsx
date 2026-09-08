import React, { useState, useEffect, useMemo } from 'react';
import { TribeType } from '@/types';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';
import TribeFilters from './TribeFilters';
import ExploreGrid from './ExploreGrid';
import ProfileModal from './ProfileModal';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowUpRight, Crown, MapPin, Compass } from 'lucide-react';
import { getPublicProfilePhoto, isValidProfileName, PUBLIC_PROFILE_FIELDS } from '@/utils/profile';
import { DistanceBucket, useProfileDistanceBuckets } from '@/hooks/useProfileDistanceBuckets';
import type {
  OwnActiveStory,
  StoryProfile,
  StorySelection,
  VisibleStoryMetadata,
} from './storyTypes';

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

function isVisibleStoryMetadata(value: unknown): value is VisibleStoryMetadata {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.story_id === 'string'
    && typeof row.owner_id === 'string'
    && typeof row.created_at === 'string'
    && typeof row.expires_at === 'string'
    && typeof row.viewed_by_caller === 'boolean';
}

function isOwnActiveStory(value: unknown): value is OwnActiveStory {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.story_id === 'string'
    && typeof row.media_data === 'string'
    && typeof row.media_type === 'string'
    && typeof row.created_at === 'string'
    && typeof row.expires_at === 'string';
}

function hasAcceptedStoryDataUrl(value: string): boolean {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.exec(value);
  if (!match) return false;
  const payload = value.slice(value.indexOf(',') + 1);
  return new TextEncoder().encode(payload).byteLength <= 2097152;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('無法讀取圖片檔案。'));
    };
    reader.onerror = () => reject(new Error('無法讀取圖片檔案。'));
    reader.readAsDataURL(file);
  });
}

interface NearbyUser {
  id: string;
  full_name: string;
  age: number | null;
  photo_url?: string;
  location: string;
  isVIP: boolean;
  isOnline: boolean;
  accent: string;
  distanceBucket?: DistanceBucket;
}

interface Recommendation {
  id: string;
  full_name: string;
  age: number | null;
  photo_url?: string;
  location: string;
  bio: string;
  isVIP: boolean;
  isOnline: boolean;
  distanceBucket?: DistanceBucket;
}

const normalizeProfiles = (records: Array<Record<string, unknown> | ProfileRecord>): ProfileRecord[] => {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  return records.flatMap((profile) => {
    const raw = profile as Record<string, unknown>;
    const id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id : null;
    if (!id) return [];
    const rawName = typeof raw.full_name === 'string' ? raw.full_name : '';
    const name = isValidProfileName(rawName) ? rawName : '';

    const numericAge = Number(raw.age);
    const age = Number.isFinite(numericAge) && numericAge > 0 ? numericAge : null;
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
      full_name: name,
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

export default function ExploreTab() {
  const { user: authUser } = useAuth();
  const { blockedUsers, blockListStatus } = useApp();
  const { t } = useLanguage();
  const [viewingStory, setViewingStory] = useState<StorySelection | null>(null);
  const [activeTribe, setActiveTribe] = useState<TribeType>('all');

  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileFetchError, setProfileFetchError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vip'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);
  const [visibleStories, setVisibleStories] = useState<VisibleStoryMetadata[]>([]);
  const [ownStory, setOwnStory] = useState<OwnActiveStory | null>(null);
  const [storyProfileOverrides, setStoryProfileOverrides] = useState<ProfileRecord[]>([]);
  const [isStoryListLoading, setIsStoryListLoading] = useState(false);
  const [isOwnStoryLoading, setIsOwnStoryLoading] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [storyNotice, setStoryNotice] = useState<string | null>(null);

  const fetchRealProfiles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PUBLIC_PROFILE_FIELDS);

      if (error) throw error;

      const nextUsers = normalizeProfiles(Array.isArray(data) ? data : []);
      const otherProfiles = nextUsers.filter(profile => profile.id !== authUser?.id);
      const mine = nextUsers.find(profile => profile.id === authUser?.id) ?? null;

      setProfiles(otherProfiles);
      setMyProfile(mine);
      setProfileFetchError(null);
    } catch (error) {
      console.error('🔴 獲取真實名片失敗:', error);
      setProfiles([]);
      setMyProfile(null);
      setProfileFetchError('目前無法載入使用者資料，請稍後再試。');
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  const loadOwnStory = React.useCallback(async () => {
    if (!authUser?.id) {
      setOwnStory(null);
      setIsOwnStoryLoading(false);
      return;
    }

    setIsOwnStoryLoading(true);
    const { data, error } = await supabase.rpc('get_own_active_story');
    if (error) {
      console.error('無法載入我的限時動態:', error);
      setOwnStory(null);
      setStoryError('目前無法載入我的限時動態，請稍後再試。');
      setIsOwnStoryLoading(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : null;
    setOwnStory(isOwnActiveStory(row) ? row : null);
    setIsOwnStoryLoading(false);
  }, [authUser?.id]);

  const loadVisibleStories = React.useCallback(async () => {
    if (!authUser?.id || blockListStatus !== 'ready') {
      setVisibleStories([]);
      setIsStoryListLoading(false);
      return;
    }

    setIsStoryListLoading(true);
    const { data, error } = await supabase.rpc('list_visible_stories');
    if (error) {
      console.error('無法載入限時動態清單:', error);
      setVisibleStories([]);
      setStoryError('目前無法載入限時動態，請稍後再試。');
      setIsStoryListLoading(false);
      return;
    }

    setVisibleStories(Array.isArray(data) ? data.filter(isVisibleStoryMetadata) : []);
    setIsStoryListLoading(false);
  }, [authUser?.id, blockListStatus]);

  const refreshStories = React.useCallback(async () => {
    await Promise.all([loadOwnStory(), loadVisibleStories()]);
  }, [loadOwnStory, loadVisibleStories]);

  const handleCreateStory = React.useCallback(async (file: File) => {
    if (!authUser?.id) {
      setStoryError('請先登入後再新增限時動態。');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStoryError('限時動態僅支援 JPEG、PNG 或 WebP 圖片。');
      return;
    }

    setIsCreatingStory(true);
    setStoryError(null);
    setStoryNotice(null);

    try {
      const mediaData = await fileToDataUrl(file);
      if (!hasAcceptedStoryDataUrl(mediaData)) {
        throw new Error('圖片格式不符或編碼後大小超過限時動態上限。');
      }

      const { error } = await supabase.rpc('create_own_story', {
        p_media_data: mediaData,
        p_media_type: 'image',
      });

      if (error) throw error;

      await refreshStories();
      setStoryNotice('限時動態已發布。');
    } catch (error) {
      console.error('新增限時動態失敗:', error);
      setStoryError(error instanceof Error ? error.message : '無法新增限時動態，請稍後再試。');
    } finally {
      setIsCreatingStory(false);
    }
  }, [authUser?.id, refreshStories]);

  const handleDeleteOwnStory = React.useCallback(async (storyId: string): Promise<boolean> => {
    setStoryError(null);
    setStoryNotice(null);

    const { data, error } = await supabase.rpc('delete_own_story', {
      p_story_id: storyId,
    });

    if (error || data !== true) {
      if (error) console.error('刪除限時動態失敗:', error);
      setStoryError('無法刪除限時動態，請稍後再試。');
      return false;
    }

    await refreshStories();
    setStoryNotice('限時動態已刪除。');
    return true;
  }, [refreshStories]);

  const handleStoryViewed = React.useCallback((storyId: string) => {
    setVisibleStories((current) => current.map((story) => (
      story.story_id === storyId ? { ...story, viewed_by_caller: true } : story
    )));
  }, []);

  const handleStoryUnavailable = React.useCallback((storyId: string) => {
    setVisibleStories((current) => current.filter((story) => story.story_id !== storyId));
    void loadVisibleStories();
  }, [loadVisibleStories]);

  useEffect(() => {
    if (authUser) {
      fetchRealProfiles();
    } else {
      setProfiles([]);
      setMyProfile(null);
      setProfileFetchError(null);
      setIsLoading(false);
    }
  }, [authUser, fetchRealProfiles]);

  useEffect(() => {
    setStoryError(null);
    setStoryNotice(null);
    void refreshStories();
  }, [refreshStories]);

  useEffect(() => {
    if (blockListStatus === 'ready') {
      void loadVisibleStories();
    }
  }, [blockListStatus, blockedUsers, loadVisibleStories]);

  useEffect(() => {
    const handleProfileUpdated = () => {
      void fetchRealProfiles();
    };

    window.addEventListener('gpulse-profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('gpulse-profile-updated', handleProfileUpdated);
  }, [fetchRealProfiles]);

  const visibleProfiles = useMemo(() => {
    if (blockListStatus !== 'ready') return [];
    return profiles.filter((profile) => !blockedUsers.has(profile.id));
  }, [blockListStatus, blockedUsers, profiles]);

  const storyProfilesById = useMemo(() => {
    const profileMap = new Map<string, StoryProfile>();
    for (const profile of [...profiles, ...storyProfileOverrides]) {
      profileMap.set(profile.id, profile);
    }
    return profileMap;
  }, [profiles, storyProfileOverrides]);

  useEffect(() => {
    const missingProfileIds = visibleStories
      .map((story) => story.owner_id)
      .filter((ownerId) => !storyProfilesById.has(ownerId));

    if (missingProfileIds.length === 0) return;

    let active = true;
    const loadMissingStoryProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PUBLIC_PROFILE_FIELDS)
        .in('id', [...new Set(missingProfileIds)]);

      if (!active) return;
      if (error) {
        console.error('無法載入限時動態的公開個人檔案:', error);
        return;
      }

      const resolved = normalizeProfiles(Array.isArray(data) ? data : []);
      setStoryProfileOverrides((current) => {
        const next = new Map(current.map((profile) => [profile.id, profile]));
        for (const profile of resolved) next.set(profile.id, profile);
        return [...next.values()];
      });
    };

    void loadMissingStoryProfiles();
    return () => { active = false; };
  }, [storyProfilesById, visibleStories]);

  const visibleProfileIds = useMemo(() => visibleProfiles.map((profile) => profile.id), [visibleProfiles]);
  const distanceBucketsByProfileId = useProfileDistanceBuckets(visibleProfileIds);

  useEffect(() => {
    if (selectedProfile && !visibleProfiles.some((profile) => profile.id === selectedProfile.id)) {
      setSelectedProfile(null);
    }
  }, [selectedProfile, visibleProfiles]);

  const nearbyUsers = useMemo<NearbyUser[]>(() => {
    const source = visibleProfiles;
    return source.slice(0, 5).map((user) => ({
      id: user.id,
      full_name: user.full_name,
      age: user.age,
      photo_url: getPublicProfilePhoto(user.public_photos, user.avatar_url),
      location: user.location,
      isVIP: user.is_vip,
      isOnline: false,
      accent: ['from-violet-500 to-blue-500', 'from-cyan-500 to-sky-500', 'from-amber-500 to-orange-500', 'from-pink-500 to-rose-500', 'from-emerald-500 to-teal-500'][user.id.charCodeAt(0) % 5],
      distanceBucket: distanceBucketsByProfileId[user.id],
    }));
  }, [distanceBucketsByProfileId, visibleProfiles]);
  const recommendations = useMemo<Recommendation[]>(() => {
    const source = visibleProfiles;
    return source.slice(5).map((user) => {
      return {
        id: user.id,
        full_name: user.full_name,
        age: user.age,
        photo_url: getPublicProfilePhoto(user.public_photos, user.avatar_url),
        location: user.location,
        bio: user.bio,
        isVIP: user.is_vip,
        isOnline: false,
        distanceBucket: distanceBucketsByProfileId[user.id],
      };
    });
  }, [distanceBucketsByProfileId, visibleProfiles]);

  const filteredRecommendations = useMemo(() => {
    const items = [...recommendations];
    const result = items.filter((item) => {
      if (selectedFilter === 'vip') return item.isVIP;
      return true;
    });

    result.sort((a, b) => {
      if (a.isVIP !== b.isVIP) return a.isVIP ? -1 : 1;
      return a.full_name.localeCompare(b.full_name);
    });

    return result;
  }, [recommendations, selectedFilter]);

  useEffect(() => {
    if (!filteredRecommendations.length) return;
    setSelectedUserId((prev) => prev ?? filteredRecommendations[0].id);
  }, [filteredRecommendations]);

  return (
    <div className="relative h-full overflow-y-auto bg-slate-950 pb-28">
      <section className="px-4 pt-5">
        {!isLoading && profileFetchError && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center text-xs text-rose-200" role="alert">
            {profileFetchError}
          </div>
        )}
        {!isLoading && blockListStatus !== 'ready' && (
          <div className={`mb-4 rounded-xl border p-3 text-center text-xs ${
            blockListStatus === 'loading'
              ? 'border-violet-500/20 bg-violet-500/5 text-violet-200/70'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`}>
            {blockListStatus === 'loading'
              ? t('explore.blockLoading', '正在確認封鎖名單…')
              : t('explore.blockUnavailable', '目前無法安全載入探索名單，請稍後再試。')}
          </div>
        )}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/70">Discover</p>
            <h2 className="text-lg font-bold text-white">{t('explore.title', '探索使用者')}</h2>
          </div>
          <button className="flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200">
            {t('explore.viewAll', '查看全部')}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`nearby-skeleton-${index}`} className="min-w-[120px] rounded-[22px] border border-white/5 bg-slate-900/80 p-2 shadow-lg shadow-slate-950/30 backdrop-blur-xl">
                <div className="h-32 w-full rounded-[18px] bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="h-3 w-12 rounded-full bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                  <span className="h-3 w-10 rounded-full bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : profileFetchError ? null : nearbyUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/30">
            <Compass className="w-8 h-8" />
            <p className="text-xs">{t('explore.noUsers', '暫時沒有其他使用者')}</p>
          </div>
        ) : (
          <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nearbyUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={`group relative min-w-[120px] overflow-hidden rounded-[22px] border p-2 text-left shadow-lg shadow-slate-950/40 backdrop-blur-xl transition hover:-translate-y-0.5 ${selectedUserId === user.id ? 'border-violet-500/70 shadow-violet-500/15' : 'border-white/10 hover:border-violet-500/50'}`}
              >
                <div className={`relative overflow-hidden rounded-[18px] bg-gradient-to-br ${user.accent} p-[1px]`}>
                  <div className="relative overflow-hidden rounded-[17px]">
                    {user.photo_url ? (
                      <img src={user.photo_url} alt={user.full_name} className="h-32 w-full object-cover" />
                    ) : (
                      <div className="h-32 w-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{isValidProfileName(user.full_name) ? user.full_name.slice(0, 2).toUpperCase() : '??'}</span>
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
                        <p className="text-base font-bold leading-none text-white">{isValidProfileName(user.full_name) ? user.full_name : t('common.unknownName', '尚未設定名稱')}</p>
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

      <section className="px-4 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">For You</p>
            <h2 className="text-lg font-bold text-white">{t('explore.latest', '系統最新推薦')}</h2>
          </div>
          <button className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 shadow-lg shadow-orange-500/20">
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
        ) : profileFetchError ? null : filteredRecommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/30">
            <Crown className="w-8 h-8" />
            <p className="text-xs">{t('explore.noRecommendations', '目前還沒有推薦使用者')}</p>
          </div>
        ) : (
          <div className="columns-2 gap-3">
            {filteredRecommendations.map((item) => (
              <article
                key={item.id}
                onClick={() => setSelectedUserId(item.id)}
                className={`mb-3 inline-block w-full cursor-pointer overflow-hidden rounded-[24px] border bg-slate-900/80 shadow-lg shadow-slate-950/40 backdrop-blur-xl break-inside-avoid transition hover:-translate-y-0.5 ${selectedUserId === item.id ? 'border-violet-500/60 shadow-violet-500/10' : 'border-white/10'}`}
              >
                <div className="relative overflow-hidden rounded-t-[23px]">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.full_name} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">{isValidProfileName(item.full_name) ? item.full_name.slice(0, 2).toUpperCase() : '??'}</span>
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
                        <h3 className="text-base font-bold text-white">{isValidProfileName(item.full_name) ? item.full_name : t('common.unknownName', '尚未設定名稱')}{item.age ? `, ${item.age}` : ''}</h3>
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <StoriesBar
        ownProfile={myProfile}
        ownStory={ownStory}
        visibleStories={visibleStories}
        profilesById={storyProfilesById}
        isLoading={isStoryListLoading || isOwnStoryLoading}
        errorMessage={storyError}
        notice={storyNotice}
        isCreating={isCreatingStory}
        onCreate={handleCreateStory}
        onOpenOwn={() => {
          if (ownStory) {
            setViewingStory({ kind: 'own', story: ownStory, profile: myProfile });
          }
        }}
        onOpenVisible={(story) => {
          setViewingStory({
            kind: 'visible',
            story,
            profile: storyProfilesById.get(story.owner_id) ?? null,
          });
        }}
      />
      <TribeFilters active={activeTribe} onChange={setActiveTribe} />
      <ExploreGrid
        activeTribe={activeTribe}
        profiles={visibleProfiles}
        myProfile={myProfile}
        onViewProfile={setSelectedProfile}
      />

      {selectedProfile && (
        <ProfileModal user={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}

      {viewingStory && (
        <StoryViewer
          selection={viewingStory}
          onClose={() => setViewingStory(null)}
          onViewed={handleStoryViewed}
          onUnavailable={handleStoryUnavailable}
          onDeleteOwn={handleDeleteOwnStory}
        />
      )}
    </div>
  );
}
