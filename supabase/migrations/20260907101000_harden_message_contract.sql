-- Phase 4.9 draft only. Do not apply until the existing messages policy
-- catalog and function-owner review are attached to the deployment review.
--
-- Rollback notes:
--   * Drop policy messages_insert_participant_only.
--   * Drop the two RPCs after the frontend no longer calls them.
--   * Drop NOT NULL/default changes only after reviewing future writes.

BEGIN;

-- Phase 4.8 verified that existing rows have no NULL flags. Re-check at
-- apply time so this migration cannot silently coerce production data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.messages
    WHERE is_read IS NULL
       OR is_hidden IS NULL
       OR is_vanish IS NULL
  ) THEN
    RAISE EXCEPTION
      'Refusing to normalize messages flags while NULL values exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND cmd IN ('UPDATE', 'ALL')
  ) THEN
    RAISE EXCEPTION
      'Refusing to harden message updates while an existing UPDATE/ALL policy is present';
  END IF;

  -- Restrictive policies compose with, rather than replace, a permissive
  -- INSERT policy. Abort if the audited sender-only policy no longer covers
  -- browser callers, rather than silently denying all valid message inserts.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND cmd IN ('INSERT', 'ALL')
      AND permissive = 'PERMISSIVE'
      AND roles::text[] && ARRAY['public', 'authenticated']::text[]
  ) THEN
    RAISE EXCEPTION
      'Refusing to add a restrictive messages INSERT policy without a compatible permissive INSERT policy';
  END IF;
END;
$$;

ALTER TABLE public.messages
  ALTER COLUMN is_read SET DEFAULT false,
  ALTER COLUMN is_hidden SET DEFAULT false,
  ALTER COLUMN is_vanish SET DEFAULT false,
  ALTER COLUMN is_read SET NOT NULL,
  ALTER COLUMN is_hidden SET NOT NULL,
  ALTER COLUMN is_vanish SET NOT NULL;

-- This restrictive policy composes safely with the existing sender-only
-- permissive INSERT policy without requiring an unknown policy name to be
-- dropped. It rejects inserts into unrelated conversations.
CREATE POLICY messages_insert_participant_only
ON public.messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND is_read IS FALSE
  AND is_hidden IS FALSE
  AND is_vanish IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.mark_messages_read(message_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  updated_count integer;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '28000';
  END IF;

  IF message_ids IS NULL OR cardinality(message_ids) = 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.messages m
  SET is_read = true
  WHERE m.id = ANY(message_ids)
    AND m.is_read IS FALSE
    AND m.sender_id <> caller_id
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = m.conversation_id
        AND (c.user1_id = caller_id OR c.user2_id = caller_id)
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.hide_own_vanish_message(message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '28000';
  END IF;

  IF message_id IS NULL THEN
    RAISE EXCEPTION 'message_id is required' USING ERRCODE = '22004';
  END IF;

  UPDATE public.messages m
  SET is_hidden = true
  WHERE m.id = message_id
    AND m.sender_id = caller_id
    AND m.is_vanish IS TRUE
    AND m.is_hidden IS FALSE
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = m.conversation_id
        AND (c.user1_id = caller_id OR c.user2_id = caller_id)
    );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_messages_read(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_messages_read(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.hide_own_vanish_message(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hide_own_vanish_message(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.hide_own_vanish_message(uuid) TO authenticated;

COMMIT;
