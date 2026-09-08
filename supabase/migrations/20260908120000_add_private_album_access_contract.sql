-- Approved Private Album access contract. This migration is intentionally
-- atomic: an unexpected object or privilege contradiction must abort all work.
BEGIN;

CREATE TABLE private.private_album_access (
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT private_album_access_pkey PRIMARY KEY (owner_id, requester_id),
  CONSTRAINT private_album_access_distinct_profiles_check CHECK (owner_id <> requester_id),
  CONSTRAINT private_album_access_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE private.private_album_access ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE private.private_album_access FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE private.private_album_access FROM anon;
REVOKE ALL PRIVILEGES ON TABLE private.private_album_access FROM authenticated;

-- Domain notifications must be created only by trusted server-side actions.
DROP POLICY "允許發送通知" ON public.notifications;
REVOKE INSERT ON TABLE public.notifications FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.request_private_album(target_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  result_status text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;

  IF target_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Target profile is required';
  END IF;

  IF target_profile_id = caller_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cannot request your own private album';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = target_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Target profile not found';
  END IF;

  IF private.is_interaction_blocked(caller_id, target_profile_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Private album interaction is unavailable';
  END IF;

  INSERT INTO private.private_album_access (owner_id, requester_id, status)
  VALUES (target_profile_id, caller_id, 'pending')
  ON CONFLICT (owner_id, requester_id) DO UPDATE
    SET status = 'pending',
        updated_at = now()
    WHERE private.private_album_access.status = 'rejected'
      AND private.private_album_access.updated_at <= now() - interval '24 hours'
  RETURNING status INTO result_status;

  IF FOUND THEN
    INSERT INTO public.notifications (receiver_id, sender_id, type)
    VALUES (target_profile_id, caller_id, 'album_request');

    RETURN result_status;
  END IF;

  SELECT status
  INTO result_status
  FROM private.private_album_access
  WHERE owner_id = target_profile_id
    AND requester_id = caller_id;

  RETURN result_status;
END;
$function$;

CREATE FUNCTION public.respond_private_album_request(
  requester_profile_id uuid,
  approve boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  next_status text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;

  IF requester_profile_id IS NULL OR approve IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Requester and decision are required';
  END IF;

  IF requester_profile_id = caller_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cannot respond to your own request';
  END IF;

  IF approve AND private.is_interaction_blocked(caller_id, requester_profile_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Private album interaction is unavailable';
  END IF;

  next_status := CASE WHEN approve THEN 'approved' ELSE 'rejected' END;

  UPDATE private.private_album_access
  SET status = next_status,
      updated_at = now()
  WHERE owner_id = caller_id
    AND requester_id = requester_profile_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pending private album request not found';
  END IF;

  RETURN next_status;
END;
$function$;

CREATE FUNCTION public.revoke_private_album_access(requester_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;

  IF requester_profile_id IS NULL OR requester_profile_id = caller_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A different requester is required';
  END IF;

  UPDATE private.private_album_access
  SET status = 'rejected',
      updated_at = now()
  WHERE owner_id = caller_id
    AND requester_id = requester_profile_id
    AND status = 'approved';

  RETURN FOUND;
END;
$function$;

CREATE FUNCTION public.get_authorized_private_photos(target_profile_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  photos text[];
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;

  IF target_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Target profile is required';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = target_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Target profile not found';
  END IF;

  IF caller_id <> target_profile_id THEN
    IF private.is_interaction_blocked(caller_id, target_profile_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Private album access is unavailable';
    END IF;

    PERFORM 1
    FROM private.private_album_access
    WHERE owner_id = target_profile_id
      AND requester_id = caller_id
      AND status = 'approved';

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Private album access is not approved';
    END IF;
  END IF;

  SELECT private_photos
  INTO photos
  FROM public.profile_private_photos
  WHERE profile_id = target_profile_id;

  RETURN COALESCE(photos, ARRAY[]::text[]);
END;
$function$;

CREATE FUNCTION public.get_private_album_request_status(target_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  result_status text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;

  IF target_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Target profile is required';
  END IF;

  IF private.is_interaction_blocked(caller_id, target_profile_id) THEN
    RETURN NULL;
  END IF;

  SELECT status
  INTO result_status
  FROM private.private_album_access
  WHERE owner_id = target_profile_id
    AND requester_id = caller_id;

  RETURN result_status;
END;
$function$;

CREATE FUNCTION public.list_own_private_album_relationships()
RETURNS TABLE (
  requester_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    relationship.requester_id,
    relationship.status,
    relationship.created_at,
    relationship.updated_at
  FROM private.private_album_access AS relationship
  WHERE relationship.owner_id = caller_id
    AND relationship.status IN ('pending', 'approved')
  ORDER BY relationship.updated_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_private_album(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_private_album(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.respond_private_album_request(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_private_album_request(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_private_album_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_private_album_access(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_authorized_private_photos(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_authorized_private_photos(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_private_album_request_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_private_album_request_status(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.list_own_private_album_relationships() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_own_private_album_relationships() TO authenticated;

COMMIT;
