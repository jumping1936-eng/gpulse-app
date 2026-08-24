import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { User } from '@/types';
import { STORY_USERS } from '@/data/mockData';
import { useApp } from '@/context/AppContext';

interface Props {
  onViewStory: (user: User) => void;
}

export default function StoriesBar({ onViewStory }: Props) {
  const { myAvatar } = useApp();
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  function handleView(user: User) {
    setViewedStories(prev => new Set([...prev, user.id]));
    onViewStory(user);
  }

  return (
    <div className="px-3 pt-4 pb-2">
      {/* ✅ 總監已將跨瀏覽器隱藏捲軸的 Tailwind 語法整合進來了，您無需尋找！ */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        
        {/* My story */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-dashed border-white/20 group-hover:border-violet-500/60 transition-all flex items-center justify-center overflow-hidden">
              {myAvatar ? (
                <img src={myAvatar} alt="Me" className="w-full h-full object-cover" />
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

        {/* Other users' stories */}
        {STORY_USERS.map(user => {
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
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${user.gradientFrom} ${user.gradientTo} flex items-center justify-center border-2 border-slate-950 transition-all group-hover:scale-105 overflow-hidden`}>
                  <span className="text-white font-bold text-sm">{user.initials}</span>
                </div>
                {!isViewed && (
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6, #22d3ee)' }} />
                )}
              </div>
              <span className={`text-[10px] font-medium truncate max-w-[56px] ${isViewed ? 'text-white/30' : 'text-white/70'}`}>
                {user.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}