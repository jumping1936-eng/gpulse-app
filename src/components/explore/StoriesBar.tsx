import React, { useState } from 'react';
import { Plus } from 'lucide-react';
// 移除了 STORY_USERS 的假資料依賴

// ✅ 1. 擴充 Props，接收來自 ExploreTab 的真實資料
interface StoryProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
}

interface Props {
  onViewStory: (user: StoryProfile) => void;
  profiles: StoryProfile[];
  myProfile: StoryProfile | null;
}

export default function StoriesBar({ onViewStory, profiles, myProfile }: Props) {
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  function handleView(user: StoryProfile) {
    setViewedStories(prev => new Set([...prev, user.id]));
    onViewStory(user);
  }

  // ✅ 2. 動態運算缺乏頭像時的替代視覺
  const getGradient = (index: number) => {
    const gradients = [
      'from-blue-600 to-violet-600',
      'from-orange-500 to-red-600',
      'from-emerald-500 to-teal-700',
      'from-pink-500 to-rose-600'
    ];
    return gradients[index % gradients.length];
  };

  const getInitials = (name?: string) => {
    return name ? name.substring(0, 2).toUpperCase() : '??';
  };

  return (
    <div className="px-3 pt-4 pb-2">
      <div className="flex items-center gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        
        {/* ========================================== */}
        {/* 自己的限時動態 (讀取真實 myProfile) */}
        {/* ========================================== */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-dashed border-white/20 group-hover:border-violet-500/60 transition-all flex items-center justify-center overflow-hidden">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                  <span className="text-white/50 text-lg font-bold">我</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-white/50 text-[10px] font-medium">我的動態</span>
        </div>

        {/* ========================================== */}
        {/* 其他使用者的限時動態 (讀取真實 profiles，最多取前 15 筆避免過載) */}
        {/* ========================================== */}
        {profiles.slice(0, 15).map((user, index) => {
          const isViewed = viewedStories.has(user.id);
          
          return (
            <div
              key={user.id}
              onClick={() => handleView(user)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            >
              <div className="relative p-0.5 rounded-full" style={{
                background: isViewed
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #7c3aed, #3b82f6, #22d3ee)',
                padding: isViewed ? '2px' : '2.5px',
              }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-slate-950 transition-all group-hover:scale-105 overflow-hidden bg-slate-800">
                  
                  {/* 若有真實頭像則顯示，否則顯示漸層與縮寫 */}
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradient(index)} flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">
                        {getInitials(user.full_name)}
                      </span>
                    </div>
                  )}

                </div>
                
                {/* 未讀時的呼吸燈特效 */}
                {!isViewed && (
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6, #22d3ee)' }} />
                )}
              </div>
              
              {/* 取名字的第一個單字以防過長 */}
              <span className={`text-[10px] font-medium truncate max-w-[56px] ${isViewed ? 'text-white/30' : 'text-white/70'}`}>
                {user.full_name?.split(' ')[0] || 'Unknown'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}