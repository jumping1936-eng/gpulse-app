-- Approved location privacy contract: only 0.1-degree coarse coordinates are
-- persisted in the protected private schema. This migration is intentionally atomic.
BEGIN;

CREATE TABLE private.profile_locations (
  profile_id uuid PRIMARY KEY
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,
  coarse_latitude double precision NOT NULL,
  coarse_longitude double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profile_locations_coarse_latitude_range_check
    CHECK (coarse_latitude >= -90.0 AND coarse_latitude <= 90.0),
  CONSTRAINT profile_locations_coarse_longitude_range_check
    CHECK (coarse_longitude >= -180.0 AND coarse_longitude <= 180.0),
  CONSTRAINT profile_locations_coarse_latitude_grid_check
    CHECK (
      coarse_latitude = round(coarse_latitude::numeric, 1)::double precision
    ),
  CONSTRAINT profile_locations_coarse_longitude_grid_check
    CHECK (
      coarse_longitude = round(coarse_longitude::numeric, 1)::double precision
    )
);

ALTER TABLE private.profile_locations OWNER TO postgres;
ALTER TABLE private.profile_locations ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE private.profile_locations
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.set_own_location(
  latitude_input double precision,
  longitude_input double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  IF latitude_input IS NULL
     OR longitude_input IS NULL
     OR COALESCE(
       NOT (
         latitude_input >= -90.0
         AND latitude_input <= 90.0
         AND longitude_input >= -180.0
         AND longitude_input <= 180.0
       ),
       true
     )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid location coordinates';
  END IF;

  PERFORM 1
  FROM public.profiles
  WHERE id = caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Profile does not exist';
  END IF;

  INSERT INTO private.profile_locations (
    profile_id,
    coarse_latitude,
    coarse_longitude,
    updated_at
  )
  VALUES (
    caller_id,
    round(latitude_input::numeric, 1)::double precision,
    round(longitude_input::numeric, 1)::double precision,
    now()
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    coarse_latitude = EXCLUDED.coarse_latitude,
    coarse_longitude = EXCLUDED.coarse_longitude,
    updated_at = EXCLUDED.updated_at;
END;
$function$;

ALTER FUNCTION public.set_own_location(double precision, double precision)
  OWNER TO postgres;

CREATE FUNCTION public.clear_own_location()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  DELETE FROM private.profile_locations
  WHERE profile_id = caller_id;
END;
$function$;

ALTER FUNCTION public.clear_own_location()
  OWNER TO postgres;

CREATE FUNCTION public.get_own_location_status()
RETURNS TABLE (
  has_location boolean,
  updated_at timestamptz,
  is_fresh boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    location_row.profile_id IS NOT NULL,
    location_row.updated_at,
    COALESCE(location_row.updated_at >= now() - interval '24 hours', false)
  FROM (VALUES (caller_id)) AS caller(profile_id)
  LEFT JOIN private.profile_locations AS location_row
    ON location_row.profile_id = caller.profile_id;
END;
$function$;

ALTER FUNCTION public.get_own_location_status()
  OWNER TO postgres;

CREATE FUNCTION public.get_profile_distance_buckets(
  target_profile_ids uuid[]
)
RETURNS TABLE (
  target_profile_id uuid,
  distance_bucket text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  IF target_profile_ids IS NULL
     OR cardinality(target_profile_ids) = 0
  THEN
    RETURN;
  END IF;

  IF cardinality(target_profile_ids) > 200 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A maximum of 200 target profile IDs is allowed';
  END IF;

  RETURN QUERY
  WITH requester_location AS (
    SELECT
      location_row.coarse_latitude,
      location_row.coarse_longitude
    FROM private.profile_locations AS location_row
    WHERE location_row.profile_id = caller_id
      AND location_row.updated_at >= now() - interval '24 hours'
  ),
  requested_targets AS (
    SELECT DISTINCT requested.target_profile_id
    FROM unnest(target_profile_ids) AS requested(target_profile_id)
    WHERE requested.target_profile_id IS NOT NULL
  ),
  visible_targets AS (
    SELECT
      target.id,
      target_location.coarse_latitude,
      target_location.coarse_longitude,
      requester_location.coarse_latitude AS requester_latitude,
      requester_location.coarse_longitude AS requester_longitude
    FROM requested_targets AS requested
    JOIN public.profiles AS target
      ON target.id = requested.target_profile_id
    JOIN private.profile_locations AS target_location
      ON target_location.profile_id = target.id
     AND target_location.updated_at >= now() - interval '24 hours'
    CROSS JOIN requester_location
    WHERE target.id <> caller_id
      AND target.hide_distance IS NOT TRUE
      AND NOT private.is_interaction_blocked(caller_id, target.id)
  ),
  calculated_distances AS (
    SELECT
      visible_targets.id,
      6371.0088 * acos(
        least(
          1.0,
          greatest(
            -1.0,
            sin(radians(visible_targets.requester_latitude))
              * sin(radians(visible_targets.coarse_latitude))
            + cos(radians(visible_targets.requester_latitude))
              * cos(radians(visible_targets.coarse_latitude))
              * cos(
                radians(
                  visible_targets.coarse_longitude
                  - visible_targets.requester_longitude
                )
              )
          )
        )
      ) AS distance_km
    FROM visible_targets
  )
  SELECT
    calculated_distances.id,
    CASE
      WHEN calculated_distances.distance_km < 25.0 THEN '<25 km'
      WHEN calculated_distances.distance_km < 100.0 THEN '25–100 km'
      ELSE '100+ km'
    END
  FROM calculated_distances;
END;
$function$;

ALTER FUNCTION public.get_profile_distance_buckets(uuid[])
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.set_own_location(double precision, double precision)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_own_location()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_own_location_status()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_profile_distance_buckets(uuid[])
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.set_own_location(double precision, double precision)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_own_location()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_location_status()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_distance_buckets(uuid[])
  TO authenticated;

COMMIT;
