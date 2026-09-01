import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { StoryRecord } from '@/types';

interface StoryProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  hasStory?: boolean;
  storyViewed?: boolean;
  story?: StoryRecord | null;
}

interface Props {
  onViewStory: (user: StoryProfile, story?: StoryRecord | null) => void;
  onCreateStory?: () => void;
  profiles: StoryProfile[];
  myProfile: StoryProfile | null;
}

export default function StoriesBar({ onViewStory, onCreateStory, profiles, myProfile }: Props) {
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  function handleView(user: StoryProfile) {
    setViewedStories(prev => new Set([...prev, user.id]));
    onViewStory(user, user.story ?? null);
  }

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
        <div
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          onClick={() => {
            if (!myProfile) return;
            onViewStory(myProfile, myProfile.story ?? null);
          }}
        >
          <div className="relative">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all ${
                myProfile?.hasStory ? 'border-violet-500/80 group-hover:border-violet-400/90' : 'border-dashed border-white/20 group-hover:border-violet-500/60'
              }`}
            >
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                  <span className="text-white/50 text-lg font-bold">我</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (onCreateStory) {
                  onCreateStory();
                }
              }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg shadow-violet-500/30 hover:scale-105 transition-transform"
              aria-label="新增限時動態"
            >
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </button>
          </div>
          <span className="text-white/50 text-[10px] font-medium">我的動態</span>
        </div>

        {profiles.filter(profile => profile.hasStory).slice(0, 15).map((user, index) => {
          const isViewed = Boolean(user.storyViewed) || viewedStories.has(user.id);

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
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradient(index)} flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">{getInitials(user.full_name)}</span>
                    </div>
                  )}
                </div>

                {!isViewed && (
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6, #22d3ee)' }} />
                )}
              </div>

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