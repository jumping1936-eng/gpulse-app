import React, { useEffect, useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { getPublicProfilePhoto } from '@/utils/profile';
import { useLanguage } from '@/context/LanguageContext';
import type { StorySelection, VisibleStoryContent } from './storyTypes';

interface Props {
  selection: StorySelection;
  onClose: () => void;
  onViewed: (storyId: string) => void;
  onUnavailable: (storyId: string) => void;
  onDeleteOwn: (storyId: string) => Promise<boolean>;
}

function isVisibleStoryContent(value: unknown): value is VisibleStoryContent {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.story_id === 'string'
    && typeof row.owner_id === 'string'
    && typeof row.media_data === 'string'
    && typeof row.media_type === 'string'
    && typeof row.created_at === 'string'
    && typeof row.expires_at === 'string';
}

export default function StoryViewer({ selection, onClose, onViewed, onUnavailable, onDeleteOwn }: Props) {
  const { t } = useLanguage();
  const [content, setContent] = useState<VisibleStoryContent | null>(
    selection.kind === 'own'
      ? {
        story_id: selection.story.story_id,
        media_data: selection.story.media_data,
        media_type: selection.story.media_type,
        created_at: selection.story.created_at,
        expires_at: selection.story.expires_at,
        owner_id: selection.profile?.id ?? '',
      }
      : null,
  );
  const [isLoading, setIsLoading] = useState(selection.kind === 'visible');
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (selection.kind !== 'own') return;
    setContent({
      story_id: selection.story.story_id,
      media_data: selection.story.media_data,
      media_type: selection.story.media_type,
      created_at: selection.story.created_at,
      expires_at: selection.story.expires_at,
      owner_id: selection.profile?.id ?? '',
    });
    setIsLoading(false);
    setIsUnavailable(false);
    setErrorMessage(null);
  }, [selection]);

  useEffect(() => {
    if (selection.kind !== 'visible') return;

    let active = true;
    const loadVisibleStory = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setIsUnavailable(false);
      setContent(null);

      const { data, error } = await supabase.rpc('get_visible_story', {
        p_story_id: selection.story.story_id,
      });

      if (!active) return;

      const row = Array.isArray(data) ? data[0] : null;
      if (error) {
        console.error('無法載入限時動態:', error);
        setErrorMessage('目前無法載入限時動態，請稍後再試。');
        setIsLoading(false);
        return;
      }

      if (!isVisibleStoryContent(row)) {
        setIsUnavailable(true);
        setIsLoading(false);
        onUnavailable(selection.story.story_id);
        return;
      }

      setContent(row);
      setIsLoading(false);

      const { data: marked, error: markError } = await supabase.rpc('mark_story_viewed', {
        p_story_id: row.story_id,
      });

      if (!active) return;
      if (markError) {
        console.error('無法更新限時動態觀看狀態:', markError);
        setErrorMessage('已開啟動態，但暫時無法更新觀看狀態。');
        return;
      }

      if (marked === true) {
        onViewed(row.story_id);
        return;
      }

      setContent(null);
      setIsUnavailable(true);
      onUnavailable(row.story_id);
    };

    void loadVisibleStory();
    return () => { active = false; };
  }, [onUnavailable, onViewed, selection]);

  const profile = selection.profile;
  const profilePhoto = getPublicProfilePhoto(profile?.public_photos, profile?.avatar_url);
  const profileName = profile?.full_name || t('common.unknownName', '尚未設定名稱');

  async function handleDelete() {
    if (selection.kind !== 'own') return;
    setIsDeleting(true);
    setErrorMessage(null);
    const deleted = await onDeleteOwn(selection.story.story_id);
    setIsDeleting(false);
    if (deleted) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-black">
      <div className="absolute left-0 right-0 top-8 z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-800 ring-2 ring-white/30">
            {profilePhoto ? (
              <img src={profilePhoto} alt={profileName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white">{profileName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-white drop-shadow-md">{profileName}</p>
        </div>
        <div className="flex items-center gap-2">
          {selection.kind === 'own' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label={t('stories.deleteLabel', '刪除我的限時動態')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/80 disabled:cursor-wait"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Trash2 className="h-4 w-4 text-white" />}
            </button>
          )}
          <button type="button" onClick={onClose} aria-label={t('stories.closeLabel', '關閉限時動態')} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-950">
        {isLoading && <Loader2 className="h-8 w-8 animate-spin text-violet-300" />}
        {isUnavailable && <p className="px-8 text-center text-sm text-white/60">{t('stories.unavailable', '此限時動態目前無法觀看。')}</p>}
        {!isLoading && !isUnavailable && content && (
          <img src={content.media_data} alt={`${profileName} ${t('stories.label', '限時動態')}`} className="h-full w-full object-contain" />
        )}
        {!isLoading && !isUnavailable && !content && errorMessage && (
          <p className="px-8 text-center text-sm text-rose-200">{errorMessage}</p>
        )}
      </div>

      {errorMessage && content && (
        <p className="absolute bottom-6 left-4 right-4 rounded-lg bg-black/60 px-3 py-2 text-center text-xs text-amber-200">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
