import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Crown, Heart, MapPin, MessageCircle, Rocket, Sparkles } from 'lucide-react';
import { supabase } from '@/supabaseClient';

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

const nearbyUsers: NearbyUser[] = [
  { id: 'n1', name: 'Maya', age: 27, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80', city: '中山區', distance: '0.8 km', isVIP: true, isOnline: true, accent: 'from-violet-500 to-blue-500' },
  { id: 'n2', name: 'Theo', age: 29, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80', city: '信義區', distance: '1.2 km', isVIP: false, isOnline: true, accent: 'from-cyan-500 to-sky-500' },
  { id: 'n3', name: 'Jin', age: 31, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80', city: '大安區', distance: '1.6 km', isVIP: true, isOnline: true, accent: 'from-amber-500 to-orange-500' },
  { id: 'n4', name: 'Sora', age: 24, avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=500&q=80', city: '松山區', distance: '2.1 km', isVIP: false, isOnline: true, accent: 'from-pink-500 to-rose-500' },
  { id: 'n5', name: 'Noah', age: 26, avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=500&q=80', city: '板橋區', distance: '3.4 km', isVIP: true, isOnline: false, accent: 'from-emerald-500 to-teal-500' },
];

const recommendations: Recommendation[] = [
  {
    id: 'r1',
    name: 'Ariel',
    age: 28,
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    city: '大安區',
    title: '週末咖啡探險夥伴',
    bio: '擅長音樂選曲、喜歡城市散步與早午餐。聊天很舒服，熱愛分享好店。',
    tags: ['咖啡', '音樂', '散步'],
    score: 96,
    gradient: 'from-violet-600/90 to-blue-600/80',
    isVIP: true,
  },
  {
    id: 'r2',
    name: 'Leo',
    age: 30,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80',
    city: '中山區',
    title: '運動型聊天',
    bio: '瑜珈、登山與週末市集，熱愛無壓力交流與真誠互動。',
    tags: ['運動', '旅行', '健康'],
    score: 92,
    gradient: 'from-emerald-600/90 to-teal-600/80',
    isVIP: false,
  },
  {
    id: 'r3',
    name: 'Zoe',
    age: 25,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80',
    city: '信義區',
    title: '文青話題高手',
    bio: '喜歡看展、探店與一點點微醺的夜晚。想認識有趣而安靜的人。',
    tags: ['看展', '文青', '夜遊'],
    score: 94,
    gradient: 'from-pink-600/90 to-rose-600/80',
    isVIP: true,
  },
  {
    id: 'r4',
    name: 'Daniel',
    age: 33,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80',
    city: '松山區',
    title: '週末約會首選',
    bio: '對美食、電影和新店的探索永遠不嫌多，享受貼近生活的相處方式。',
    tags: ['美食', '電影', '約會'],
    score: 90,
    gradient: 'from-orange-500/90 to-amber-500/80',
    isVIP: false,
  },
  {
    id: 'r5',
    name: 'Iris',
    age: 26,
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    city: '中和區',
    title: '壓力小解型',
    bio: '喜歡慢慢聊，適合在放鬆的情境中相遇。生活品質很重要。',
    tags: ['慢聊', '泡茶', '放鬆'],
    score: 89,
    gradient: 'from-sky-600/90 to-indigo-600/80',
    isVIP: false,
  },
  {
    id: 'r6',
    name: 'Kian',
    age: 27,
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80',
    city: '三重區',
    title: '新鮮感對話者',
    bio: '喜歡一起去喝咖啡、逛市集，活潑但不是很吵，感受相處很自然。',
    tags: ['市集', '咖啡', '聊天'],
    score: 91,
    gradient: 'from-violet-500/90 to-fuchsia-600/80',
    isVIP: true,
  },
];

export default function HomeFeed() {
  const [profileData, setProfileData] = useState<Array<Record<string, unknown>>>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vip' | 'fresh' | 'nearby'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(recommendations[0]?.id ?? null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [boostedIds, setBoostedIds] = useState<string[]>([]);
  const [messagedIds, setMessagedIds] = useState<string[]>([]);
  const [actionTimestamps, setActionTimestamps] = useState<Record<string, number>>({});

  const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setIsLoadingProfiles(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) throw error;

        setProfileData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('HomeFeed fetch profiles failed:', error);
        setProfileData([]);
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, []);

  const liveRecommendations = useMemo(() => {
    if (!profileData.length) return recommendations;

    return profileData.map((profile, index) => {
      const profileName = typeof profile.full_name === 'string' ? profile.full_name : typeof profile.name === 'string' ? profile.name : `User ${index + 1}`;
      const profileBio = typeof profile.bio === 'string' ? profile.bio : '';
      const profileAge = typeof profile.age === 'number' ? profile.age : 25 + (index % 6);
      const profileAvatar = typeof profile.avatar_url === 'string' ? profile.avatar_url : `https://i.pravatar.cc/500?u=${index + 1}`;
      const profileCity = typeof profile.location === 'string' ? profile.location : typeof profile.city === 'string' ? profile.city : '台北市';

      return {
        id: String(profile.id ?? `home-${index}`),
        name: profileName,
        age: profileAge,
        avatar: profileAvatar,
        city: profileCity,
        title: profileBio ? (profileBio.length > 18 ? profileBio.slice(0, 18) : profileBio) : '值得認識的你',
        bio: profileBio || '為了更自然的相遇，我們都在等待一個真誠的連結。',
        tags: ['聊天', '旅行', '約會'],
        score: 88 + ((index * 3) % 12),
        gradient: [
          'from-violet-600/90 to-blue-600/80',
          'from-emerald-600/90 to-teal-600/80',
          'from-pink-600/90 to-rose-600/80',
          'from-orange-500/90 to-amber-500/80',
          'from-sky-600/90 to-indigo-600/80',
        ][index % 5],
        isVIP: index % 4 === 0,
      };
    });
  }, [profileData]);

  const filteredRecommendations = useMemo(() => {
    const items = [...liveRecommendations];

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
  }, [selectedFilter, liveRecommendations]);

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

    // Future Supabase RPC placeholder:
    // await supabase.rpc('record_user_action', { action_type: type, target_id: item.id, cooldown_hours: 24 });
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
            <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300/70">GPluse</p>
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

          {isLoadingProfiles && (
            <div className="mb-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3 text-[11px] text-violet-200">
              正在同步 Supabase 的最新推薦資料…
            </div>
          )}

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
                    <div className="overflow-hidden rounded-t-[23px]">
                      <img src={item.avatar} alt={item.name} className="h-48 w-full object-cover" />
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
        </section>
      </div>
    </div>
  );
}
