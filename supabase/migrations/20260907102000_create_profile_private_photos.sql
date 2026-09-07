-- Phase 4.9 draft only. This is a staged private-photo migration.
-- It creates the protected destination but intentionally does not copy or
-- remove profiles.private_photos until the frontend has switched contracts.
--
-- Rollback notes:
--   * Only if no frontend has written to this table, drop the owner policies,
--     then drop profile_private_photos.
--   * Do not remove the legacy profiles.private_photos column in this phase.

BEGIN;

-- The audited count was zero. Fail rather than silently leave populated
-- legacy private photos behind without an approved copy procedure.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE cardinality(private_photos) > 0
  ) THEN
    RAISE EXCEPTION
      'Refusing staged private-photo migration because profiles.private_photos contains data';
  END IF;
END;
$$;

CREATE TABLE public.profile_private_photos (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  private_photos text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_private_photos ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.profile_private_photos FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.profile_private_photos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profile_private_photos TO authenticated;

CREATE POLICY profile_private_photos_owner_select
ON public.profile_private_photos
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY profile_private_photos_owner_insert
ON public.profile_private_photos
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

CREATE POLICY profile_private_photos_owner_update
ON public.profile_private_photos
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY profile_private_photos_owner_delete
ON public.profile_private_photos
FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

COMMIT;
