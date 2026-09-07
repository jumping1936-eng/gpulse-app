import React, { useState, useEffect, useMemo } from 'react';
import { TribeType } from '@/types';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';
import TribeFilters from './TribeFilters';
import ExploreGrid from './ExploreGrid';
import ProfileModal from './ProfileModal';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpRight, Crown, MapPin, Compass } from 'lucide-react';
import { getPublicProfilePhoto, isValidProfileName } from '@/utils/profile';

type StoryUser = {
  id: string;
  full_name?: string;
  avatar_url?: string;
  status?: string;
};

interface ProfileRecord {
  id: string;
  full_name: string;
  age: number;
  avatar_url: string;
  public_photos: string[];
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
  full_name: string;
  age: number;
  photo_url?: string;
  city: string;
  isVIP: boolean;
  isOnline: boolean;
  accent: string;
}

interface Recommendation {
  id: string;
  full_name: string;
  age: number;
  photo_url?: string;
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
    const rawName = typeof raw.full_name === 'string' ? raw.full_name : '';
    const name = isValidProfileName(rawName) ? rawName : '';

    const age = Number.isFinite(Number(raw.age)) ? Number(raw.age) : 0;
    const avatar = typeof raw.avatar_url === 'string' ? raw.avatar_url : '';
    const publicPhotos = Array.isArray(raw.public_photos)
      ? raw.public_photos.filter((item): item is string => typeof item === 'string')
      : [];
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
      public_photos: publicPhotos,
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

export default function ExploreTab() {
  const { user: authUser } = useAuth();
  const [viewingStory, setViewingStory] = useState<StoryUser | null>(null);
  const [activeTribe, setActiveTribe] = useState<TribeType>('all');

  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vip'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);

  const fetchRealProfiles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, age, avatar_url, public_photos, location, is_vip, status, bio, tribe, height, role, looking_for');

      if (error) throw error;

      const nextUsers = normalizeProfiles(Array.isArray(data) ? data : []);
      const otherProfiles = nextUsers.filter(profile => profile.id !== authUser?.id);
      const mine = nextUsers.find(profile => profile.id === authUser?.id) ?? null;

      setUsers(nextUsers);
      setProfiles(otherProfiles);
      setMyProfile(mine);
    } catch (error) {
      console.error('🔴 獲取真實名片失敗:', error);
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

  useEffect(() => {
    const handleProfileUpdated = () => {
      void fetchRealProfiles();
    };

    window.addEventListener('gpulse-profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('gpulse-profile-updated', handleProfileUpdated);
  }, [fetchRealProfiles]);

  const nearbyUsers = useMemo<NearbyUser[]>(() => {
    const source = users;
    return source.slice(0, 5).map((user) => ({
      id: user.id,
      full_name: user.full_name,
      age: user.age,
      photo_url: getPublicProfilePhoto(user.public_photos, user.avatar_url),
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
        full_name: user.full_name,
        age: user.age,
        photo_url: getPublicProfilePhoto(user.public_photos, user.avatar_url),
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
                        <p className="text-base font-bold leading-none text-white">{isValidProfileName(user.full_name) ? user.full_name : '尚未設定名稱'}</p>
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
                  <div className="absolute bottom-2 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-950/80 bg-emerald-400 shadow-[0_0_0_2px_rgba(15,23,42,0.8)]" title="online" />
                </div>

                <div className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-white">{isValidProfileName(item.full_name) ? item.full_name : '尚未設定名稱'}{item.age ? `, ${item.age}` : ''}</h3>
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

      <StoriesBar onViewStory={setViewingStory} profiles={profiles} myProfile={myProfile} />
      <TribeFilters active={activeTribe} onChange={setActiveTribe} />
      <ExploreGrid
        activeTribe={activeTribe}
        profiles={profiles}
        myProfile={myProfile}
        onViewProfile={setSelectedProfile}
      />

      {selectedProfile && (
        <ProfileModal user={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}

      {viewingStory && (
        <StoryViewer user={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </div>
  );
}
