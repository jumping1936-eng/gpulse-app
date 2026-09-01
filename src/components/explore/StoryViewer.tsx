import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import type { StoryRecord } from '@/types';

interface StoryUser {
  id: string;
  full_name?: string;
  avatar_url?: string;
  status?: string;
}

interface Props {
  user: StoryUser | null;
  story: StoryRecord | null;
  onClose: () => void;
}

export default function StoryViewer({ user, story, onClose }: Props) {
  const DURATION = 5000;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!story) {
      setSignedUrl(null);
      setError('此動態已不可用。');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchSignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: storageError } = await supabase
          .storage
          .from('story-media')
          .createSignedUrl(story.media_path, 60);

        if (storageError) throw storageError;

        if (!isMounted) return;
        setSignedUrl(data?.signedUrl ?? null);
        if (!data?.signedUrl) {
          throw new Error('signed url not found');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('🔴 無法載入 story media:', err);
        setError('此動態目前無法載入，請稍後再試。');
        setSignedUrl(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [story]);

  useEffect(() => {
    if (!story) return;

    const recordView = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) return;

        const { error } = await supabase
          .from('story_views')
          .upsert(
            { story_id: story.id, viewer_id: authUser.id, viewed_at: new Date().toISOString() },
            { onConflict: 'story_id,viewer_id' }
          );

        if (error) {
          console.error('🔴 記錄 story view 失敗:', error);
        }
      } catch (err) {
        console.error('🔴 記錄 story view 發生錯誤:', err);
      }
    };

    void recordView();
  }, [story]);

  useEffect(() => {
    if (!story) return;

    const timer = setTimeout(() => {
      onClose();
    }, DURATION);

    return () => clearTimeout(timer);
  }, [story, onClose, DURATION]);

  const getInitials = (name?: string) => name ? name.substring(0, 2).toUpperCase() : '??';
  const getGradient = (id: string = '') => {
    const gradients = ['from-blue-600 to-violet-600', 'from-orange-500 to-red-600', 'from-emerald-500 to-teal-700', 'from-pink-500 to-rose-600'];
    const charCode = id ? id.charCodeAt(0) : 0;
    return gradients[charCode % gradients.length];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col max-w-md mx-auto">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/25 overflow-hidden">
        <div
          className="h-full bg-white transition-none rounded-full"
          style={{
            width: '100%',
            animation: `storyProgress ${DURATION}ms linear forwards`,
          }}
        />
      </div>

      <div className="absolute top-8 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-white/30 overflow-hidden bg-slate-800">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getGradient(user?.id ?? '')} flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">{getInitials(user?.full_name)}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm drop-shadow-md">{user?.full_name || '使用者'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
        {!story ? (
          <div className="text-white/80 text-sm px-6 text-center">此動態已不可用。</div>
        ) : loading ? (
          <div className="text-white/80 text-sm">載入中...</div>
        ) : error ? (
          <div className="text-white/80 text-sm px-6 text-center">{error}</div>
        ) : signedUrl ? (
          <div className="w-full h-full relative flex flex-col justify-center bg-black">
            {story.media_type === 'image' ? (
              <img src={signedUrl} alt={story.caption ?? 'story'} className="w-full h-full object-contain" />
            ) : (
              <video src={signedUrl} controls playsInline className="w-full h-full object-contain bg-black" />
            )}

            {story.caption && (
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent">
                <p className="text-sm text-white/90 whitespace-pre-wrap">{story.caption}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-white/80 text-sm px-6 text-center">此動態目前無法顯示。</div>
        )}
      </div>
    </div>
  );
}