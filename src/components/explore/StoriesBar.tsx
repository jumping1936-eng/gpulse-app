import React, { useRef } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { getPublicProfilePhoto } from '@/utils/profile';
import type { OwnActiveStory, StoryProfile, VisibleStoryMetadata } from './storyTypes';

interface Props {
  ownProfile: StoryProfile | null;
  ownStory: OwnActiveStory | null;
  visibleStories: VisibleStoryMetadata[];
  profilesById: Map<string, StoryProfile>;
  isLoading: boolean;
  errorMessage: string | null;
  notice: string | null;
  isCreating: boolean;
  onCreate: (file: File) => Promise<void>;
  onOpenOwn: () => void;
  onOpenVisible: (story: VisibleStoryMetadata) => void;
}

const gradients = [
  'from-blue-600 to-violet-600',
  'from-orange-500 to-red-600',
  'from-emerald-500 to-teal-700',
  'from-pink-500 to-rose-600',
];

function initials(name: string): string {
  return name ? name.slice(0, 2).toUpperCase() : '??';
}

function profileGradient(id: string): string {
  return gradients[(id.charCodeAt(0) || 0) % gradients.length];
}

export default function StoriesBar({
  ownProfile,
  ownStory,
  visibleStories,
  profilesById,
  isLoading,
  errorMessage,
  notice,
  isCreating,
  onCreate,
  onOpenOwn,
  onOpenVisible,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ownPhoto = getPublicProfilePhoto(ownProfile?.public_photos, ownProfile?.avatar_url);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await onCreate(file);
  }

  return (
    <section className="px-3 pt-4 pb-2" aria-label="限時動態">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          disabled={isCreating}
          onClick={() => {
            if (ownStory) onOpenOwn();
            else fileInputRef.current?.click();
          }}
          className="group flex flex-shrink-0 flex-col items-center gap-1.5 disabled:cursor-wait"
        >
          <div className="relative">
            <div className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 transition-all ${
              ownStory
                ? 'border-violet-400/80 p-0.5'
                : 'border-dashed border-white/20 group-hover:border-violet-500/60'
            }`}>
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-800">
                {ownPhoto ? (
                  <img src={ownPhoto} alt="我的個人檔案" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-white/50">我</span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-br from-violet-500 to-blue-500">
              {isCreating ? <Loader2 className="h-3 w-3 animate-spin text-white" /> : <Plus className="h-3 w-3 text-white" strokeWidth={3} />}
            </div>
          </div>
          <span className="max-w-[64px] truncate text-[10px] font-medium text-white/60">
            {ownStory ? '我的動態' : '新增動態'}
          </span>
        </button>

        {visibleStories.map((story) => {
          const profile = profilesById.get(story.owner_id);
          const photo = getPublicProfilePhoto(profile?.public_photos, profile?.avatar_url);
          const viewed = story.viewed_by_caller;
          const displayName = profile?.full_name || '尚未設定名稱';

          return (
            <button
              key={story.story_id}
              type="button"
              onClick={() => onOpenVisible(story)}
              className="group flex flex-shrink-0 flex-col items-center gap-1.5"
            >
              <div
                className="relative rounded-full p-0.5"
                style={{
                  background: viewed
                    ? 'rgba(255,255,255,0.08)'
                    : 'linear-gradient(135deg, #7c3aed, #3b82f6, #22d3ee)',
                  padding: viewed ? '2px' : '2.5px',
                }}
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-slate-950 bg-slate-800 transition-all group-hover:scale-105">
                  {photo ? (
                    <img src={photo} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${profileGradient(story.owner_id)}`}>
                      <span className="text-sm font-bold text-white">{initials(displayName)}</span>
                    </div>
                  )}
                </div>
                {!viewed && (
                  <div
                    className="absolute inset-0 animate-ping rounded-full opacity-20"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6, #22d3ee)' }}
                  />
                )}
              </div>
              <span className={`max-w-[56px] truncate text-[10px] font-medium ${viewed ? 'text-white/30' : 'text-white/70'}`}>
                {displayName}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading && <p className="mt-2 text-center text-xs text-white/40">正在載入限時動態…</p>}
      {errorMessage && <p className="mt-2 text-center text-xs text-rose-300">{errorMessage}</p>}
      {notice && <p className="mt-2 text-center text-xs text-emerald-300">{notice}</p>}
      {!isLoading && !errorMessage && visibleStories.length === 0 && (
        <p className="mt-2 text-center text-xs text-white/35">目前沒有可觀看的限時動態。</p>
      )}
    </section>
  );
}
