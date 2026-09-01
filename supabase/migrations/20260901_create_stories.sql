-- GPluse Stories v1
-- Purpose:
--   1) create story media records with 24-hour expiry
--   2) record view events per story per viewer
--   3) enforce owner-only upload/update/delete behavior
--   4) keep block-aware visibility in DB/RLS, not UI-only
--   5) use storage.private bucket and soft delete

BEGIN;

CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_path text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  caption text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stories_expires_after_created CHECK (expires_at > created_at),
  CONSTRAINT stories_caption_length CHECK (caption IS NULL OR char_length(caption) <= 500)
);

CREATE TABLE IF NOT EXISTS public.story_views (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE OR REPLACE FUNCTION public.set_story_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stories_set_updated_at ON public.stories;
CREATE TRIGGER stories_set_updated_at
BEFORE UPDATE ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.set_story_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_story_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'stories.user_id is immutable';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'stories.created_at is immutable';
    END IF;

    IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      RAISE EXCEPTION 'stories.expires_at is immutable';
    END IF;

    IF NEW.media_path IS DISTINCT FROM OLD.media_path THEN
      RAISE EXCEPTION 'stories.media_path is immutable';
    END IF;

    IF NEW.user_id <> auth.uid() THEN
      RAISE EXCEPTION 'users can only update their own stories';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stories_prevent_immutable_fields ON public.stories;
CREATE TRIGGER stories_prevent_immutable_fields
BEFORE UPDATE ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.prevent_story_immutable_fields();

CREATE INDEX IF NOT EXISTS stories_user_id_created_at_idx
  ON public.stories (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS stories_expires_at_idx
  ON public.stories (expires_at);

CREATE INDEX IF NOT EXISTS stories_user_id_active_idx
  ON public.stories (user_id, is_deleted, expires_at DESC);

CREATE INDEX IF NOT EXISTS story_views_story_id_viewed_at_idx
  ON public.story_views (story_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS story_views_viewer_id_idx
  ON public.story_views (viewer_id);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stories: authenticated users can view valid stories" ON public.stories;
CREATE POLICY "Stories: authenticated users can view valid stories"
ON public.stories
FOR SELECT
TO authenticated
USING (
  is_deleted = false
  AND expires_at > now()
  AND (
    user_id = auth.uid()
    OR (
      NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE b.blocker_id = auth.uid()
          AND b.blocked_id = stories.user_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocks b2
        WHERE b2.blocker_id = stories.user_id
          AND b2.blocked_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Stories: users can insert own stories" ON public.stories;
CREATE POLICY "Stories: users can insert own stories"
ON public.stories
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND media_path IS NOT NULL
  AND media_path <> ''
  AND media_path LIKE ('stories/' || auth.uid()::text || '/%')
  AND media_type IN ('image', 'video')
  AND (caption IS NULL OR char_length(caption) <= 500)
);

DROP POLICY IF EXISTS "Stories: users can update own stories" ON public.stories;
CREATE POLICY "Stories: users can update own stories"
ON public.stories
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND media_type IN ('image', 'video')
  AND (caption IS NULL OR char_length(caption) <= 500)
);

-- v1 intentionally does not allow direct row deletion.
-- Use soft delete via UPDATE and set is_deleted=true, deleted_at=now().
DROP POLICY IF EXISTS "Stories: users can soft-delete own stories" ON public.stories;
CREATE POLICY "Stories: users can soft-delete own stories"
ON public.stories
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND is_deleted = true
  AND deleted_at IS NOT NULL
  AND deleted_at >= created_at
);

DROP POLICY IF EXISTS "Story views: story owner or viewer can read own records" ON public.story_views;
CREATE POLICY "Story views: story owner or viewer can read own records"
ON public.story_views
FOR SELECT
TO authenticated
USING (
  viewer_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.stories s
    WHERE s.id = story_views.story_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Story views: users can insert own view records" ON public.story_views;
CREATE POLICY "Story views: users can insert own view records"
ON public.story_views
FOR INSERT
TO authenticated
WITH CHECK (
  viewer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.stories s
    WHERE s.id = story_views.story_id
      AND s.is_deleted = false
      AND s.expires_at > now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE b.blocker_id = auth.uid()
          AND b.blocked_id = s.user_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocks b2
        WHERE b2.blocker_id = s.user_id
          AND b2.blocked_id = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "Story views: viewers can remove own records" ON public.story_views;
CREATE POLICY "Story views: viewers can remove own records"
ON public.story_views
FOR DELETE
TO authenticated
USING (viewer_id = auth.uid());

DROP POLICY IF EXISTS "Story views: no updates to view records" ON public.story_views;
CREATE POLICY "Story views: no updates to view records"
ON public.story_views
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Storage bucket for story media.
-- Keep private to prevent direct public sharing and enforce owner-only access.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story-media',
  'story-media',
  false,
  26214400,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = now();

DROP POLICY IF EXISTS "Story media: users can upload own story media" ON storage.objects;
CREATE POLICY "Story media: users can upload own story media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'story-media'
  AND owner = auth.uid()
  AND split_part(name, '/', 1) = 'stories'
  AND split_part(name, '/', 2) = auth.uid()::text
  AND split_part(name, '/', 3) <> ''
  AND split_part(name, '/', 4) LIKE 'original.%'
);

DROP POLICY IF EXISTS "Story media: users can update own story media" ON storage.objects;
CREATE POLICY "Story media: users can update own story media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'story-media'
  AND owner = auth.uid()
  AND split_part(name, '/', 1) = 'stories'
  AND split_part(name, '/', 2) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'story-media'
  AND owner = auth.uid()
  AND split_part(name, '/', 1) = 'stories'
  AND split_part(name, '/', 2) = auth.uid()::text
  AND split_part(name, '/', 4) LIKE 'original.%'
);

DROP POLICY IF EXISTS "Story media: users can delete own story media" ON storage.objects;
CREATE POLICY "Story media: users can delete own story media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'story-media'
  AND owner = auth.uid()
  AND split_part(name, '/', 1) = 'stories'
  AND split_part(name, '/', 2) = auth.uid()::text
);

DROP POLICY IF EXISTS "Story media: allow owner or visible viewer to select media" ON storage.objects;
CREATE POLICY "Story media: allow owner or visible viewer to select media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'story-media'
  AND (
    owner = auth.uid()
    OR (
      name LIKE 'stories/%/%/original.%'
      AND split_part(name, '/', 1) = 'stories'
      AND split_part(name, '/', 2) <> ''
      AND split_part(name, '/', 3) <> ''
      AND split_part(name, '/', 4) LIKE 'original.%'
      AND EXISTS (
        SELECT 1
        FROM public.stories s
        WHERE s.id::text = split_part(name, '/', 3)
          AND s.user_id::text = split_part(name, '/', 2)
          AND s.is_deleted = false
          AND s.expires_at > now()
          AND s.user_id <> auth.uid()
          AND NOT EXISTS (
            SELECT 1
            FROM public.blocks b
            WHERE b.blocker_id = auth.uid()
              AND b.blocked_id = s.user_id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM public.blocks b2
            WHERE b2.blocker_id = s.user_id
              AND b2.blocked_id = auth.uid()
          )
      )
    )
  )
);

COMMIT;
