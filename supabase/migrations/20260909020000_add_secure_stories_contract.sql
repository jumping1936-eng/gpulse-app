-- Approved Stories MVP contract. Story data is private and can only be
-- accessed through the narrowly scoped authenticated RPCs below.
BEGIN;

CREATE TABLE private.stories (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  owner_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_data text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  expires_at timestamptz NOT NULL DEFAULT (
    pg_catalog.now() + interval '24 hours'
  ),

  CONSTRAINT stories_one_per_owner_key UNIQUE (owner_id),
  CONSTRAINT stories_media_type_check CHECK (media_type = 'image'),
  CONSTRAINT stories_media_data_format_check CHECK (
    media_data ~ '^data:image/(jpeg|png|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$'
  ),
  CONSTRAINT stories_media_data_size_check CHECK (
    octet_length(substr(media_data, position(',' IN media_data) + 1)) <= 2097152
  ),
  CONSTRAINT stories_media_data_decode_check CHECK (
    pg_catalog.decode(
      substr(media_data, position(',' IN media_data) + 1),
      'base64'
    ) IS NOT NULL
  ),
  CONSTRAINT stories_exact_expiry_check CHECK (
    expires_at = created_at + interval '24 hours'
  )
);

CREATE TABLE private.story_views (
  story_id uuid NOT NULL
    REFERENCES private.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT pg_catalog.now(),

  CONSTRAINT story_views_pkey PRIMARY KEY (story_id, viewer_id)
);

CREATE INDEX stories_active_expiry_idx
  ON private.stories (expires_at);

CREATE INDEX story_views_viewer_story_idx
  ON private.story_views (viewer_id, story_id);

ALTER TABLE private.stories OWNER TO postgres;
ALTER TABLE private.story_views OWNER TO postgres;

ALTER TABLE private.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.story_views ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE private.stories
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE private.story_views
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_own_story(
  p_media_data text,
  p_media_type text
)
RETURNS TABLE (
  story_id uuid,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_payload text;
  v_created_at timestamptz;
  v_story_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  PERFORM 1
  FROM public.profiles AS p
  WHERE p.id = v_caller
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Profile required';
  END IF;

  IF p_media_type IS DISTINCT FROM 'image'
     OR p_media_data IS NULL
     OR p_media_data !~ '^data:image/(jpeg|png|webp);base64,' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid Story media';
  END IF;

  v_payload := substr(p_media_data, position(',' IN p_media_data) + 1);

  IF v_payload !~ '^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$'
     OR octet_length(v_payload) > 2097152 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid Story media';
  END IF;

  BEGIN
    PERFORM pg_catalog.decode(v_payload, 'base64');
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid Story media';
  END;

  v_created_at := pg_catalog.clock_timestamp();

  DELETE FROM private.stories AS s
  WHERE s.owner_id = v_caller;

  INSERT INTO private.stories (
    owner_id,
    media_data,
    media_type,
    created_at,
    expires_at
  )
  VALUES (
    v_caller,
    p_media_data,
    'image',
    v_created_at,
    v_created_at + interval '24 hours'
  )
  RETURNING id INTO v_story_id;

  RETURN QUERY
  SELECT
    v_story_id,
    v_created_at,
    v_created_at + interval '24 hours';
END;
$function$;

CREATE FUNCTION public.delete_own_story(
  p_story_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  DELETE FROM private.stories AS s
  WHERE s.id = p_story_id
    AND s.owner_id = v_caller;

  RETURN FOUND;
END;
$function$;

CREATE FUNCTION public.get_own_active_story()
RETURNS TABLE (
  story_id uuid,
  media_data text,
  media_type text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.media_data,
    s.media_type,
    s.created_at,
    s.expires_at
  FROM private.stories AS s
  WHERE s.owner_id = v_caller
    AND s.expires_at > pg_catalog.now();
END;
$function$;

CREATE FUNCTION public.list_visible_stories()
RETURNS TABLE (
  story_id uuid,
  owner_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  viewed_by_caller boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.owner_id,
    s.created_at,
    s.expires_at,
    EXISTS (
      SELECT 1
      FROM private.story_views AS sv
      WHERE sv.story_id = s.id
        AND sv.viewer_id = v_caller
    )
  FROM private.stories AS s
  WHERE s.owner_id <> v_caller
    AND s.expires_at > pg_catalog.now()
    AND NOT private.is_interaction_blocked(v_caller, s.owner_id)
  ORDER BY s.created_at DESC
  LIMIT 100;
END;
$function$;

CREATE FUNCTION public.get_visible_story(
  p_story_id uuid
)
RETURNS TABLE (
  story_id uuid,
  owner_id uuid,
  media_data text,
  media_type text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.owner_id,
    s.media_data,
    s.media_type,
    s.created_at,
    s.expires_at
  FROM private.stories AS s
  WHERE s.id = p_story_id
    AND s.owner_id <> v_caller
    AND s.expires_at > pg_catalog.now()
    AND NOT private.is_interaction_blocked(v_caller, s.owner_id);
END;
$function$;

CREATE FUNCTION public.mark_story_viewed(
  p_story_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_owner_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  SELECT s.owner_id
  INTO v_owner_id
  FROM private.stories AS s
  WHERE s.id = p_story_id
    AND s.expires_at > pg_catalog.now();

  IF NOT FOUND
     OR v_owner_id = v_caller
     OR private.is_interaction_blocked(v_caller, v_owner_id) THEN
    RETURN false;
  END IF;

  INSERT INTO private.story_views (story_id, viewer_id)
  VALUES (p_story_id, v_caller)
  ON CONFLICT (story_id, viewer_id) DO NOTHING;

  RETURN true;
END;
$function$;

ALTER FUNCTION public.create_own_story(text, text) OWNER TO postgres;
ALTER FUNCTION public.delete_own_story(uuid) OWNER TO postgres;
ALTER FUNCTION public.get_own_active_story() OWNER TO postgres;
ALTER FUNCTION public.list_visible_stories() OWNER TO postgres;
ALTER FUNCTION public.get_visible_story(uuid) OWNER TO postgres;
ALTER FUNCTION public.mark_story_viewed(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.create_own_story(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_own_story(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_own_active_story()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_visible_stories()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_visible_story(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_story_viewed(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_own_story(text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_story(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_active_story()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_visible_stories()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visible_story(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_story_viewed(uuid)
  TO authenticated;

COMMIT;
