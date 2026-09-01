import React, { useState, useEffect, useMemo } from 'react';
import { User, TribeType, StoryRecord } from '@/types';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';
import TribeFilters from './TribeFilters';
import ExploreGrid from './ExploreGrid';
import ProfileModal from './ProfileModal';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpRight, Crown, MapPin, Compass } from 'lucide-react';

type StoryUser = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  status?: string;
  story?: StoryRecord | null;
  hasStory?: boolean;
  storyViewed?: boolean;
};

interface ProfileRecord {
  id: string;
  full_name: string;
  age: number;
  avatar_url: string;
  location: string;
  is_vip: boolean;
  status: string;
  bio: string;
  tribe?: string;
  height?: number;
  role?: string[];
  looking_for?: string[];
}

interface NearbyUser {
  id: string;
  name: string;
  age: number;
  avatar: string;
  city: string;
  isVIP: boolean;
  isOnline: boolean;
  accent: string;
}

interface Recommendation {
  id: string;
  name: string;
  age: number;
  avatar: string;
  city: string;
  bio: string;
  isVIP: boolean;
}

const normalizeProfiles = (records: Array<Record<string, unknown> | ProfileRecord>): ProfileRecord[] => {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  return records.map((profile, index) => {
    const raw = profile as Record<string, unknown>;
    const name = typeof raw.full_name === 'string'
      ? raw.full_name
      : typeof raw.name === 'string'
        ? raw.name
        : '';

    const age = Number.isFinite(Number(raw.age)) ? Number(raw.age) : 0;
    const avatar = typeof raw.avatar_url === 'string'
      ? raw.avatar_url
      : typeof raw.avatar === 'string'
        ? raw.avatar
        : '';
    const location = typeof raw.location === 'string'
      ? raw.location
      : typeof raw.city === 'string'
        ? raw.city
        : '';
    const bio = typeof raw.bio === 'string' && raw.bio.trim().length > 0
      ? raw.bio
      : '';
    const status = typeof raw.status === 'string' ? raw.status.toLowerCase() : '';

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
      id: String(raw.id ?? `profile-${index}`),
      full_name: name,
      age,
      avatar_url: avatar,
      location,
      is_vip: Boolean(raw.is_vip ?? raw.isVIP ?? false),
      status,
      bio,
      tribe,
      height,
      role,
      looking_for: lookingFor,
    };
  });
};

const VALID_TRIBES: TribeType[] = ['bear', 'wolf', 'otter', 'twink', 'jock', 'chat', 'relationship'];

const mapTribe = (value: string | undefined): TribeType | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return VALID_TRIBES.find((tribe) => tribe === normalized);
};

const ALLOWED_STORY_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);

const MAX_STORY_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_STORY_VIDEO_SIZE = 25 * 1024 * 1024;

const getStoryExtFromMime = (mimeType: string): string => {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };

  return map[mimeType.toLowerCase()] ?? 'bin';
};

const validateStoryFile = (file: File) => {
  const mime = file.type.toLowerCase();
  if (!ALLOWED_STORY_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      mediaType: null as 'image' | 'video' | null,
      error: '僅支援 JPG / PNG / WebP / GIF / MP4 / WebM 格式。',
    };
  }

  const mediaType = mime.startsWith('video/') ? 'video' : 'image';
  const maxSize = mediaType === 'video' ? MAX_STORY_VIDEO_SIZE : MAX_STORY_IMAGE_SIZE;

  if (file.size > maxSize) {
    return {
      valid: false,
      mediaType,
      error: mediaType === 'video'
        ? '影片大小不可超過 25 MB。'
        : '圖片大小不可超過 5 MB。',
    };
  }

  return { valid: true, mediaType, error: null };
};

const mapProfileToUser = (
  profile: ProfileRecord,
  index: number,
  story: StoryRecord | null = null,
  storyViewed = false,
): User => ({
  id: profile.id,
  name: profile.full_name,
  age: profile.age,
  tribe: mapTribe(profile.tribe),
  gradientFrom: ['violet-500', 'cyan-500', 'amber-500', 'pink-500', 'emerald-500'][index % 5],
  gradientTo: ['blue-500', 'sky-500', 'orange-500', 'rose-500', 'teal-500'][index % 5],
  initials: profile.full_name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
  isVerified: profile.is_vip,
  isVIP: profile.is_vip,
  hasStory: Boolean(story),
  storyViewed,
  bio: profile.bio,
  height: profile.height ? `${profile.height}` : undefined,
  role: Array.isArray(profile.role) ? profile.role.join(', ') : profile.role,
  lookingFor: Array.isArray(profile.looking_for) ? profile.looking_for.join(', ') : profile.looking_for,
  lastSeen: profile.status === 'online' ? '線上' : '離線',
});

export default function ExploreTab() {
  const { user: authUser } = useAuth();
  const [viewingStory, setViewingStory] = useState<StoryUser | null>(null);
  const [activeTribe, setActiveTribe] = useState<TribeType>('all');

  const [profiles, setProfiles] = useState<User[]>([]);
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vip'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);
  const [isStoryComposerOpen, setIsStoryComposerOpen] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyCaption, setStoryCaption] = useState('');
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [storyUploadError, setStoryUploadError] = useState<string | null>(null);
  const [storyUploadSuccess, setStoryUploadSuccess] = useState<string | null>(null);

  const fetchRealProfiles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*');
      if (profilesError) throw profilesError;

      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('is_deleted', false)
        .gt('expires_at', new Date().toISOString());

      if (storyError) throw storyError;

      const stories = Array.isArray(storyData) ? (storyData as StoryRecord[]) : [];
      const storiesByUser = new Map<string, StoryRecord[]>();
      stories.forEach((story) => {
        const list = storiesByUser.get(story.user_id) ?? [];
        list.push(story);
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        storiesByUser.set(story.user_id, list);
      });

      const { data: viewData, error: viewError } = authUser
        ? await supabase.from('story_views').select('story_id').eq('viewer_id', authUser.id)
        : { data: [], error: null };

      if (viewError) throw viewError;

      const viewedStoryIds = new Set(
        (Array.isArray(viewData) ? viewData : []).map((row) => String((row as { story_id?: string }).story_id ?? ''))
          .filter(Boolean)
      );

      const nextUsers = normalizeProfiles(Array.isArray(profilesData) ? profilesData : []);
      const appProfiles = nextUsers.map((profile, index) => {
        const userStories = storiesByUser.get(profile.id) ?? [];
        const latestStory = userStories[0] ?? null;
        const storyViewed = latestStory ? viewedStoryIds.has(latestStory.id) : false;

        return {
          ...mapProfileToUser(profile, index, latestStory, storyViewed),
          story: latestStory,
          storyViewed,
          hasStory: Boolean(latestStory),
        } as User & { story?: StoryRecord | null; hasStory: boolean; storyViewed: boolean };
      });

      const otherProfiles = appProfiles.filter(profile => profile.id !== authUser?.id);
      const mine = appProfiles.find(profile => profile.id === authUser?.id) ?? null;

      setUsers(nextUsers);
      setProfiles(otherProfiles);
      setMyProfile(mine as User | null);
    } catch (error) {
      console.error('🔴 獲取真實名片與 stories 失敗:', error);
      setUsers([]);
      setProfiles([]);
      setMyProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (authUser) {
      fetchRealProfiles();
    } else {
      setUsers([]);
      setProfiles([]);
      setMyProfile(null);
      setIsLoading(false);
    }
  }, [authUser, fetchRealProfiles]);

  const handleStoryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setStoryFile(null);
      return;
    }

    const validation = validateStoryFile(file);
    if (!validation.valid) {
      setStoryFile(null);
      setStoryUploadError(validation.error ?? '不支援的檔案格式。');
      event.target.value = '';
      return;
    }

    setStoryFile(file);
    setStoryUploadError(null);
    event.target.value = '';
  };

  const handlePublishStory = async () => {
    if (!authUser || !storyFile) {
      setStoryUploadError('請先選擇一張圖片或一支影片。');
      return;
    }

    const validation = validateStoryFile(storyFile);
    if (!validation.valid || !validation.mediaType) {
      setStoryUploadError(validation.error ?? '檔案驗證失敗。');
      return;
    }

    const trimmedCaption = storyCaption.trim();
    if (trimmedCaption.length > 500) {
      setStoryUploadError('Caption 最多 500 字元。');
      return;
    }

    setIsUploadingStory(true);
    setStoryUploadError(null);
    setStoryUploadSuccess(null);

    const storyId = crypto.randomUUID();
    const ext = getStoryExtFromMime(storyFile.type || 'application/octet-stream');
    const storagePath = `stories/${authUser.id}/${storyId}/original.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('story-media')
        .upload(storagePath, storyFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: storyFile.type || undefined,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: insertError } = await supabase
        .from('stories')
        .insert([
          {
            id: storyId,
            user_id: authUser.id,
            media_path: storagePath,
            media_type: validation.mediaType,
            caption: trimmedCaption.length > 0 ? trimmedCaption : null,
          },
        ]);

      if (insertError) {
        try {
          await supabase.storage.from('story-media').remove([storagePath]);
        } catch (cleanupError) {
          console.error('🔴 Story upload cleanup failed:', cleanupError);
        }

        throw insertError;
      }

      setStoryUploadSuccess('限時動態已成功發布。');
      setIsStoryComposerOpen(false);
      setStoryFile(null);
      setStoryCaption('');
      await fetchRealProfiles();
    } catch (error: unknown) {
      console.error('🔴 Story publish failed:', error);
      const message = error instanceof Error ? error.message : '未知錯誤';
      setStoryUploadError(`發布失敗：${message}`);
      setIsStoryComposerOpen(true);
    } finally {
      setIsUploadingStory(false);
    }
  };

  const nearbyUsers = useMemo<NearbyUser[]>(() => {
    const source = users;
    return source.slice(0, 5).map((user) => ({
      id: user.id,
      name: user.full_name,
      age: user.age,
      avatar: user.avatar_url,
      city: user.location,
      isVIP: user.is_vip,
      isOnline: user.status === 'online',
      accent: ['from-violet-500 to-blue-500', 'from-cyan-500 to-sky-500', 'from-amber-500 to-orange-500', 'from-pink-500 to-rose-500', 'from-emerald-500 to-teal-500'][user.id.charCodeAt(0) % 5],
    }));
  }, [users]);
  const recommendations = useMemo<Recommendation[]>(() => {
    const source = users;
    return source.slice(5).map((user) => {
      return {
        id: user.id,
        name: user.full_name,
        age: user.age,
        avatar: user.avatar_url,
        city: user.location,
        bio: user.bio,
        isVIP: user.is_vip,
      };
    });
  }, [users]);

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

  return (
    <div className="relative h-full overflow-y-auto bg-slate-950 pb-28">
      <section className="px-4 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/70">Nearby</p>
            <h2 className="text-lg font-bold text-white">附近活躍使用者</h2>
          </div>
          <button className="flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200">
            查看全部
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
        ) : nearbyUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/30">
            <Compass className="w-8 h-8" />
            <p className="text-xs">附近暫時沒有其他使用者</p>
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
                        <p className="text-base font-bold leading-none text-white">{user.name}</p>
                        <p className="mt-1 text-[10px] text-white/80">{user.age}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-slate-950/60 px-1.5 py-1 text-[9px] text-emerald-300 backdrop-blur-xl">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {user.isOnline ? 'online' : 'away'}
                      </div>
                    </div>
                  </div>
                </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-300">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-violet-300" />
                      {user.city}
                    </span>
                  </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {storyUploadSuccess && (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
          {storyUploadSuccess}
        </div>
      )}

      {isStoryComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-slate-950/60">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">新增限時動態</h3>
              <button
                type="button"
                onClick={() => {
                  setIsStoryComposerOpen(false);
                  setStoryUploadError(null);
                }}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300"
              >
                關閉
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] text-slate-300">選擇圖片 / 影片</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                  onChange={handleStoryFileChange}
                  className="block w-full cursor-pointer rounded-xl border border-dashed border-violet-500/40 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-full file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-slate-300">Caption（選填，最多 500 字）</span>
                <textarea
                  value={storyCaption}
                  onChange={(event) => setStoryCaption(event.target.value.slice(0, 500))}
                  placeholder="寫下這刻的心情..."
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/60 focus:outline-none"
                />
              </label>

              {storyFile && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-2 text-[11px] text-violet-200">
                  {storyFile.name} · {Math.round(storyFile.size / 1024)} KB
                </div>
              )}

              {storyUploadError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                  {storyUploadError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePublishStory}
                disabled={isUploadingStory || !storyFile || !authUser}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingStory ? '上傳中...' : '發布限時動態'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="px-4 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">For You</p>
            <h2 className="text-lg font-bold text-white">系統最新推薦</h2>
          </div>
          <button className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 shadow-lg shadow-orange-500/20">
            今日精選
          </button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'all', label: '全部' },
            { id: 'vip', label: 'VIP' },
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
        ) : filteredRecommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/30">
            <Crown className="w-8 h-8" />
            <p className="text-xs">目前還沒有推薦使用者</p>
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
                  <div className="absolute bottom-2 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-950/80 bg-emerald-400 shadow-[0_0_0_2px_rgba(15,23,42,0.8)]" title="online" />
                </div>

                <div className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-white">{item.name}, {item.age}</h3>
                        {item.isVIP && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-300">
                        <MapPin className="h-3 w-3 text-violet-300" />
                        {item.city}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] leading-5 text-slate-300">{item.bio}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <StoriesBar
        onViewStory={setViewingStory}
        onCreateStory={() => {
          if (!authUser) {
            setStoryUploadError('請先登入後再發布限時動態。');
            return;
          }
          setStoryUploadError(null);
          setStoryUploadSuccess(null);
          setIsStoryComposerOpen(true);
        }}
        profiles={profiles}
        myProfile={myProfile}
      />
      <TribeFilters active={activeTribe} onChange={setActiveTribe} />
      <ExploreGrid
        activeTribe={activeTribe}
        profiles={profiles}
        myProfile={myProfile}
        onViewProfile={(profile) => setSelectedProfile(profile as ProfileRecord | null)}
      />

      {selectedProfile && (
        <ProfileModal user={selectedProfile as React.ComponentProps<typeof ProfileModal>['user']} onClose={() => setSelectedProfile(null)} />
      )}

      {viewingStory && (
        <StoryViewer user={viewingStory} story={viewingStory.story ?? null} onClose={() => setViewingStory(null)} />
      )}
    </div>
  );
}