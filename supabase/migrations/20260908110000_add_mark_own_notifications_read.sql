CREATE FUNCTION public.mark_own_notifications_read(
  notification_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  changed_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  IF notification_ids IS NULL
     OR cardinality(notification_ids) = 0 THEN
    RETURN 0;
  END IF;

  IF cardinality(notification_ids) > 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'At most 500 notification IDs may be marked read per request';
  END IF;

  UPDATE public.notifications
  SET is_read = true
  WHERE receiver_id = auth.uid()
    AND id = ANY(notification_ids)
    AND is_read IS DISTINCT FROM true;

  GET DIAGNOSTICS changed_count = ROW_COUNT;

  RETURN changed_count;
END;
$function$;

REVOKE EXECUTE
ON FUNCTION public.mark_own_notifications_read(uuid[])
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.mark_own_notifications_read(uuid[])
FROM anon;

GRANT EXECUTE
ON FUNCTION public.mark_own_notifications_read(uuid[])
TO authenticated;
