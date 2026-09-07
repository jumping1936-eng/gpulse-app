-- Phase 4.9 draft only. Do not apply until the Phase 4.8 catalog baseline is
-- attached to the deployment review.
--
-- Rollback notes:
--   * Restore the prior get_or_create_conversation body from the remote
--     catalog backup.
--   * Drop conversations_unordered_participants_unique only after confirming
--     no dependent policy or function relies on it.

BEGIN;

-- Historical self-conversations are quarantined legacy data. They are kept
-- intact, including any attached messages, until an explicit data-retention
-- decision authorizes controlled cleanup. New self-conversations are instead
-- prevented by get_or_create_conversation at the supported creation boundary.
DO $$
DECLARE
  self_conversation_count integer;
BEGIN
  SELECT count(*)
    INTO self_conversation_count
  FROM public.conversations
  WHERE user1_id = user2_id;

  IF self_conversation_count > 1 THEN
    RAISE EXCEPTION
      'Refusing to harden with % historical self-conversations; manual data review is required',
      self_conversation_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.conversations
    GROUP BY least(user1_id, user2_id), greatest(user1_id, user2_id)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Refusing to add unordered participant uniqueness while duplicate conversations exist';
  END IF;
END;
$$;

-- Do not create a duplicate expression index if an equivalent one is already
-- present under another name. An existing historical A/A row is valid here:
-- both canonical expressions evaluate to A, and uniqueness permits one row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indrelid = 'public.conversations'::regclass
      AND i.indisunique
      AND pg_get_expr(i.indexprs, i.indrelid) ILIKE '%least(user1_id, user2_id)%'
      AND pg_get_expr(i.indexprs, i.indrelid) ILIKE '%greatest(user1_id, user2_id)%'
  ) THEN
    EXECUTE '
      CREATE UNIQUE INDEX conversations_unordered_participants_unique
      ON public.conversations
      (least(user1_id, user2_id), greatest(user1_id, user2_id))';
  END IF;
END;
$$;

-- CREATE OR REPLACE retains the existing postgres owner. The fixed search path
-- prevents caller-controlled object resolution. The explicit self-target
-- rejection happens before any lookup, so this function never returns the
-- quarantined legacy A/A conversation.
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  conversation_id uuid;
  first_participant uuid;
  second_participant uuid;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '28000';
  END IF;

  IF other_id IS NULL THEN
    RAISE EXCEPTION 'other_id is required' USING ERRCODE = '22004';
  END IF;

  IF other_id = caller_id THEN
    RAISE EXCEPTION 'A conversation requires two distinct users' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = other_id) THEN
    RAISE EXCEPTION 'Target profile does not exist' USING ERRCODE = '23503';
  END IF;

  first_participant := least(caller_id, other_id);
  second_participant := greatest(caller_id, other_id);

  -- Serialize concurrent requests for the same unordered pair. Symmetric
  -- block enforcement is deliberately deferred until its helper is verified.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(first_participant::text || ':' || second_participant::text, 0)
  );

  SELECT c.id
    INTO conversation_id
  FROM public.conversations c
  WHERE c.user1_id = first_participant
    AND c.user2_id = second_participant
  LIMIT 1;

  IF conversation_id IS NOT NULL THEN
    RETURN conversation_id;
  END IF;

  INSERT INTO public.conversations (user1_id, user2_id)
  VALUES (first_participant, second_participant)
  RETURNING id INTO conversation_id;

  RETURN conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

COMMIT;
