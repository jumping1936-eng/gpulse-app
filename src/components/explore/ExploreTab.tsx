import React, { useState, useEffect, useMemo } from 'react';
import { User, TribeType } from '@/types';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';
import TribeFilters from './TribeFilters';
import ExploreGrid from './ExploreGrid';
import ProfileModal from './ProfileModal';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ArrowUpRight, Crown, Loader2, MapPin } from 'lucide-react';

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
  location: string;
  is_vip: boolean;
  status: string;
  bio: string;
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
  distance: string;
}

interface Recommendation {
  id: string;
  name: string;
  age: number;
  avatar: string;
  city: string;
  title: string;
  bio: string;
  tags: string[];
  score: number;
  gradient: string;
  isVIP: boolean;
}

const fallbackProfiles: ProfileRecord[] = [
  { id: 'fallback-1', full_name: 'Maya', age: 27, avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80', location: '中山區', is_vip: true, status: 'online', bio: '喜歡週末咖啡與城市漫遊，聊得很自然。' },
  { id: 'fallback-2', full_name: 'Theo', age: 29, avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80', location: '信義區', is_vip: false, status: 'online', bio: '熱愛運動、旅行與慢速聊天，對生活有品味。' },
  { id: 'fallback-3', full_name: 'Jin', age: 31, avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80', location: '大安區', is_vip: true, status: 'online', bio: '音樂、展覽和新店探索都很上癮。' },
  { id: 'fallback-4', full_name: 'Sora', age: 24, avatar_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=500&q=80', location: '松山區', is_vip: false, status: 'online', bio: '簡單而真誠，喜歡逛市集和談天說地。' },
  { id: 'fallback-5', full_name: 'Noah', age: 26, avatar_url: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=80', location: '板橋區', is_vip: true, status: 'offline', bio: '想認識有趣又安靜的人，慢慢相處比較舒服。' },
  { id: 'fallback-6', full_name: 'Ariel', age: 28, avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80', location: '大安區', is_vip: true, status: 'online', bio: '週末咖啡探險夥伴，喜歡音樂與城市散步。' },
  { id: 'fallback-7', full_name: 'Leo', age: 30, avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80', location: '中山區', is_vip: false, status: 'online', bio: '瑜珈、登山與週末市集，熱愛無壓力交流。' },
  { id: 'fallback-8', full_name: 'Zoe', age: 25, avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80', location: '信義區', is_vip: true, status: 'online', bio: '看展、探店與微醺夜晚，想認識有趣的人。' },
  { id: 'fallback-9', full_name: 'Daniel', age: 33, avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80', location: '松山區', is_vip: false, status: 'offline', bio: '對美食、電影和新店探索永遠不嫌多。' },
  { id: 'fallback-10', full_name: 'Iris', age: 26, avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80', location: '中和區', is_vip: false, status: 'online', bio: '喜歡慢慢聊、泡茶與放鬆的相處節奏。' },
];

const gradientOptions = [
  'from-violet-600/90 to-blue-600/80',
  'from-emerald-600/90 to-teal-600/80',
  'from-pink-600/90 to-rose-600/80',
  'from-orange-500/90 to-amber-500/80',
  'from-sky-600/90 to-indigo-600/80',
];

const normalizeProfiles = (records: Array<Record<string, unknown> | ProfileRecord>): ProfileRecord[] => {
  if (!Array.isArray(records) || records.length === 0) {
    return fallbackProfiles;
  }

  return records.map((profile, index) => {
    const raw = profile as Record<string, unknown>;
    const name = typeof raw.full_name === 'string'
      ? raw.full_name
      : typeof raw.name === 'string'
        ? raw.name
        : `User ${index + 1}`;

    const age = Number.isFinite(Number(raw.age)) ? Number(raw.age) : 25 + (index % 6);
    const avatar = typeof raw.avatar_url === 'string'
      ? raw.avatar_url
      : typeof raw.avatar === 'string'
        ? raw.avatar
        : `https://i.pravatar.cc/500?u=${index + 1}`;
    const location = typeof raw.location === 'string'
      ? raw.location
      : typeof raw.city === 'string'
        ? raw.city
        : '台北市';
    const bio = typeof raw.bio === 'string' && raw.bio.trim().length > 0
      ? raw.bio
      : '為了更自然的相遇，我們都在等待一個真誠的連結。';
    const status = typeof raw.status === 'string' ? raw.status.toLowerCase() : index % 3 === 0 ? 'offline' : 'online';

    return {
      id: String(raw.id ?? `profile-${index}`),
      full_name: name,
      age,
      avatar_url: avatar,
      location,
      is_vip: Boolean(raw.is_vip ?? raw.isVIP ?? false),
      status,
      bio,
    };
  });
};

const mapProfileToUser = (profile: ProfileRecord, index: number): User => ({
  id: profile.id,
  name: profile.full_name,
  age: profile.age,
  tribe: (['bear', 'wolf', 'otter', 'twink', 'jock', 'chat', 'relationship'] as TribeType[])[index % 7],
  distance: `${(index + 1) * 0.8} km`,
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
  hasStory: true,
  storyViewed: false,
  bio: profile.bio,
  height: '165-178cm',
  role: 'New here',
  lookingFor: '真誠相遇',
  lastSeen: profile.status === 'online' ? '線上' : '離線',
  bodyType: '均衡型',
});

export default function ExploreTab() {
  const { user: authUser } = useAuth();
  const [viewingStory, setViewingStory] = useState<StoryUser | null>(null);
  const [activeTribe, setActiveTribe] = useState<TribeType>('all');

  const [profiles, setProfiles] = useState<User[]>([]);
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vip' | 'fresh' | 'nearby'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);

  const fetchRealProfiles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*');

      if (error) throw error;

      const nextUsers = normalizeProfiles(Array.isArray(data) ? data : []);
      const appProfiles = nextUsers.map(mapProfileToUser);
      const otherProfiles = appProfiles.filter(profile => profile.id !== authUser?.id);
      const mine = appProfiles.find(profile => profile.id === authUser?.id) ?? null;

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

  const nearbyUsers = useMemo<NearbyUser[]>(() => {
    const source = users.length ? users : fallbackProfiles;
    return source.slice(0, 5).map((user, index) => ({
      id: user.id,
      name: user.full_name,
      age: user.age,
      avatar: user.avatar_url,
      city: user.location,
      isVIP: user.is_vip,
      isOnline: user.status === 'online',
      accent: ['from-violet-500 to-blue-500', 'from-cyan-500 to-sky-500', 'from-amber-500 to-orange-500', 'from-pink-500 to-rose-500', 'from-emerald-500 to-teal-500'][index % 5],
      distance: `${(index + 1) * 0.8} km`,
    }));
  }, [users]);

  const recommendations = useMemo<Recommendation[]>(() => {
    const source = users.length ? users : fallbackProfiles;
    return source.slice(5).map((user, index) => {
      const titleMap = ['週末咖啡探險夥伴', '運動型聊天', '文青話題高手', '週末約會首選', '壓力小解型', '新鮮感對話者'];
      const tagsByIndex = [
        ['咖啡', '音樂', '散步'],
        ['運動', '旅行', '健康'],
        ['看展', '文青', '夜遊'],
        ['美食', '電影', '約會'],
        ['慢聊', '泡茶', '放鬆'],
        ['市集', '咖啡', '聊天'],
      ];

      return {
        id: user.id,
        name: user.full_name,
        age: user.age,
        avatar: user.avatar_url,
        city: user.location,
        title: titleMap[index % titleMap.length],
        bio: user.bio,
        tags: tagsByIndex[index % tagsByIndex.length],
        score: 88 + ((index + 1) * 3) % 10,
        gradient: gradientOptions[index % gradientOptions.length],
        isVIP: user.is_vip,
      };
    });
  }, [users]);

  const filteredRecommendations = useMemo(() => {
    const items = [...recommendations];
    const result = items.filter((item) => {
      if (selectedFilter === 'vip') return item.isVIP;
      if (selectedFilter === 'fresh') return item.score >= 92;
      if (selectedFilter === 'nearby') return item.score >= 90;
      return true;
    });

    result.sort((a, b) => {
      if (a.isVIP !== b.isVIP) return a.isVIP ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
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
                    <img src={user.avatar} alt={user.name} className="h-32 w-full object-cover" />
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
                  <span className="text-violet-200">{user.distance}</span>
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
            { id: 'fresh', label: '新鮮' },
            { id: 'nearby', label: '附近' },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedFilter(filter.id as 'all' | 'vip' | 'fresh' | 'nearby')}
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
        ) : (
          <div className="columns-2 gap-3">
            {filteredRecommendations.map((item) => (
              <article
                key={item.id}
                onClick={() => setSelectedUserId(item.id)}
                className={`mb-3 inline-block w-full cursor-pointer overflow-hidden rounded-[24px] border bg-slate-900/80 shadow-lg shadow-slate-950/40 backdrop-blur-xl break-inside-avoid transition hover:-translate-y-0.5 ${selectedUserId === item.id ? 'border-violet-500/60 shadow-violet-500/10' : 'border-white/10'}`}
              >
                <div className={`relative bg-gradient-to-br ${item.gradient} p-[1px]`}>
                  <div className="relative overflow-hidden rounded-t-[23px]">
                    <img src={item.avatar} alt={item.name} className="h-48 w-full object-cover" />
                    {item.isVIP && (
                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                        <Crown className="h-3 w-3" />
                        VIP
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-950/80 bg-emerald-400 shadow-[0_0_0_2px_rgba(15,23,42,0.8)]" title="online" />
                  </div>
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
                    <div className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                      {item.score}%
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">Matching</p>
                    <h4 className="mt-1 text-sm font-bold text-white">{item.title}</h4>
                  </div>

                  <p className="text-[11px] leading-5 text-slate-300">{item.bio}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-medium text-slate-200">
                        #{tag}
                      </span>
                    ))}
                  </div>
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
        onViewProfile={(profile) => setSelectedProfile(profile as ProfileRecord | null)}
      />

      {selectedProfile && (
        <ProfileModal user={selectedProfile as any} onClose={() => setSelectedProfile(null)} />
      )}

      {viewingStory && (
        <StoryViewer user={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </div>
  );
}