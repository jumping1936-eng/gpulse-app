import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Crown, Heart, MapPin, MessageCircle, Rocket, Sparkles } from 'lucide-react';
import { supabase } from '@/supabaseClient';

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
  distance: string;
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
  title: string;
  bio: string;
  tags: string[];
  score: number;
  gradient: string;
  isVIP: boolean;
}

const fallbackProfiles: ProfileRecord[] = [
  { id: 'fb-1', full_name: 'Maya', age: 27, avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80', location: '中山區', is_vip: true, status: 'online', bio: '喜歡週末咖啡與城市漫遊，聊得很自然。' },
  { id: 'fb-2', full_name: 'Theo', age: 29, avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80', location: '信義區', is_vip: false, status: 'online', bio: '熱愛運動、旅行與慢速聊天，對生活有品味。' },
  { id: 'fb-3', full_name: 'Jin', age: 31, avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80', location: '大安區', is_vip: true, status: 'online', bio: '音樂、展覽和新店探索都很上癮。' },
  { id: 'fb-4', full_name: 'Sora', age: 24, avatar_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=500&q=80', location: '松山區', is_vip: false, status: 'online', bio: '簡單而真誠，喜歡逛市集和談天說地。' },
  { id: 'fb-5', full_name: 'Noah', age: 26, avatar_url: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=80', location: '板橋區', is_vip: true, status: 'offline', bio: '想認識有趣又安靜的人，慢慢相處比較舒服。' },
  { id: 'fb-6', full_name: 'Ariel', age: 28, avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80', location: '大安區', is_vip: true, status: 'online', bio: '週末咖啡探險夥伴，喜歡音樂與城市散步。' },
  { id: 'fb-7', full_name: 'Leo', age: 30, avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80', location: '中山區', is_vip: false, status: 'online', bio: '瑜珈、登山與週末市集，熱愛無壓力交流。' },
  { id: 'fb-8', full_name: 'Zoe', age: 25, avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80', location: '信義區', is_vip: true, status: 'online', bio: '看展、探店與微醺夜晚，想認識有趣的人。' },
  { id: 'fb-9', full_name: 'Daniel', age: 33, avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80', location: '松山區', is_vip: false, status: 'offline', bio: '對美食、電影和新店探索永遠不嫌多。' },
  { id: 'fb-10', full_name: 'Iris', age: 26, avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80', location: '中和區', is_vip: false, status: 'online', bio: '喜歡慢慢聊、泡茶與放鬆的相處節奏。' },
  { id: 'fb-11', full_name: 'Kian', age: 27, avatar_url: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80', location: '三重區', is_vip: true, status: 'online', bio: '喜歡一起喝咖啡、逛市集和輕鬆聊天。' },
];

const gradientOptions = [
  'from-violet-600/90 to-blue-600/80',
  'from-emerald-600/90 to-teal-600/80',
  'from-pink-600/90 to-rose-600/80',
  'from-orange-500/90 to-amber-500/80',
  'from-sky-600/90 to-indigo-600/80',
];

const normalizeProfiles = (records: Array<Record<string, unknown> | ProfileRecord>): ProfileRecord[] => {
  const safeRecords = Array.isArray(records) ? records : [];

  if (safeRecords.length === 0) {
    return fallbackProfiles;
  }

  return safeRecords.map((profile, index) => {
    const raw = profile as Record<string, unknown>;

    const profileName = typeof raw.full_name === 'string'
      ? raw.full_name
      : typeof raw.name === 'string'
        ? raw.name
        : `User ${index + 1}`;

    const rawAge = Number(raw.age ?? 25 + (index % 6));
    const age = Number.isFinite(rawAge) ? rawAge : 25 + (index % 6);
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
    const status = typeof raw.status === 'string'
      ? raw.status.toLowerCase()
      : index % 3 === 0
        ? 'offline'
        : 'online';

    return {
      id: String(raw.id ?? `home-${index}`),
      full_name: profileName,
      age,
      avatar_url: avatar,
      location,
      is_vip: Boolean(raw.is_vip ?? raw.isVIP ?? false),
      status,
      bio,
    };
  });
};

export default function HomeFeed() {
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vip' | 'fresh' | 'nearby'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [boostedIds, setBoostedIds] = useState<string[]>([]);
  const [messagedIds, setMessagedIds] = useState<string[]>([]);
  const [actionTimestamps, setActionTimestamps] = useState<Record<string, number>>({});

  const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

  useEffect(() => {
    let isMounted = true;

    const fetchProfiles = async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase.from('profiles').select('*');

        if (error) {
          throw error;
        }

        const nextUsers = normalizeProfiles(Array.isArray(data) ? data : []);

        if (!Array.isArray(data) || data.length === 0 || !nextUsers.length) {
          throw new Error('Supabase profile list is empty.');
        }

        if (isMounted) {
          setUsers(nextUsers);
        }
      } catch (error) {
        console.error('HomeFeed fetch profiles failed:', error);
        if (isMounted) {
          setUsers(normalizeProfiles(fallbackProfiles));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  const nearbyUsers = useMemo<NearbyUser[]>(() => {
    const source = users.length ? users : fallbackProfiles;

    return source.slice(0, 5).map((user, index) => ({
      id: user.id,
      name: user.full_name,
      age: user.age,
      avatar: user.avatar_url,
      city: user.location,
      distance: `${(index + 1) * 0.7} km`,
      isVIP: user.is_vip,
      isOnline: user.status === 'online',
      accent: ['from-violet-500 to-blue-500', 'from-cyan-500 to-sky-500', 'from-amber-500 to-orange-500', 'from-pink-500 to-rose-500', 'from-emerald-500 to-teal-500'][index % 5],
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

  const isWithin24Hours = (id: string, type: 'like' | 'boost' | 'message') => {
    const key = `${type}:${id}`;
    const lastAt = actionTimestamps[key];
    if (!lastAt) return false;
    return Date.now() - lastAt < TWENTY_FOUR_HOURS;
  };

  const handleAction = (type: 'like' | 'boost' | 'message', item: Recommendation) => {
    const key = `${type}:${item.id}`;
    if (isWithin24Hours(item.id, type)) {
      const labelMap = {
        like: '心動',
        boost: '推送',
        message: '訊息',
      };
      alert(`${labelMap[type]}已在 24 小時內使用過，請稍後再試。`);
      return;
    }

    if (type === 'like') {
      setLikedIds((prev) => [...new Set([...prev, item.id])]);
    }
    if (type === 'boost') {
      setBoostedIds((prev) => [...new Set([...prev, item.id])]);
    }
    if (type === 'message') {
      setMessagedIds((prev) => [...new Set([...prev, item.id])]);
    }

    setActionTimestamps((prev) => ({ ...prev, [key]: Date.now() }));

    if (type === 'message') {
      setSelectedUserId(item.id);
      const targetUser = {
        id: item.id,
        full_name: item.name,
        avatar_url: item.avatar,
        age: item.age,
        bio: item.bio,
        city: item.city,
        status: 'online',
        other_user: {
          id: item.id,
          full_name: item.name,
          avatar_url: item.avatar,
          bio: item.bio,
        },
      };
      window.dispatchEvent(new CustomEvent('jump-to-chat', { detail: targetUser }));
      return;
    }

    alert(`${type === 'like' ? '已送出心動' : '已發送推送'}：${item.name}`);
  };

  const selectedUser = filteredRecommendations.find((item) => item.id === selectedUserId) ?? filteredRecommendations[0] ?? null;

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-white">
      <div className="px-4 pb-28 pt-4">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] tracking-tight text-violet-300/70">GPulse</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Home</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-xl transition hover:bg-white/10">
              <Sparkles className="h-4 w-4" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25">
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="mb-6">
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

        <section>
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

          {selectedUser && (
            <div className="mb-4 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-3 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70">Selected</p>
                  <p className="mt-1 text-sm font-bold text-white">正在關注 {selectedUser.name}</p>
                </div>
                <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                  {selectedUser.score}% 相符度
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
                const isLiked = likedIds.includes(item.id);
                const isBoosted = boostedIds.includes(item.id);
                const isMessaged = messagedIds.includes(item.id);
                const likeCooldown = isWithin24Hours(item.id, 'like');
                const boostCooldown = isWithin24Hours(item.id, 'boost');
                const messageCooldown = isWithin24Hours(item.id, 'message');

                return (
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
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-medium text-slate-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('like', item);
                          }}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-[11px] font-semibold transition ${
                            isLiked || likeCooldown
                              ? 'bg-white/10 text-violet-200 border border-violet-500/30'
                              : 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20'
                          }`}
                        >
                          {isLiked || likeCooldown ? <Check className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
                          {isLiked || likeCooldown ? '已心動' : '心動'}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('boost', item);
                          }}
                          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                            isBoosted || boostCooldown
                              ? 'border border-amber-500/40 bg-amber-500/20 text-amber-200'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/20'
                          }`}
                          aria-label={`Boost ${item.name}`}
                        >
                          {isBoosted || boostCooldown ? <Check className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('message', item);
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
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
