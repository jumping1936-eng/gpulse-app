BEGIN;

-- Retain historical threads after an Auth account is deleted. The existing
-- participant/message policies remain the browser write boundary.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY (con.conkey)
    WHERE con.conrelid = 'public.conversations'::regclass
      AND con.contype = 'f'
      AND att.attname IN ('user1_id', 'user2_id')
  LOOP
    EXECUTE format('ALTER TABLE public.conversations DROP CONSTRAINT %I', constraint_name);
  END LOOP;

  FOR constraint_name IN
    SELECT con.conname
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY (con.conkey)
    WHERE con.conrelid = 'public.messages'::regclass
      AND con.contype = 'f'
      AND att.attname IN ('sender_id', 'conversation_id')
  LOOP
    EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END;
$$;

ALTER TABLE public.conversations
  ALTER COLUMN user1_id DROP NOT NULL,
  ALTER COLUMN user2_id DROP NOT NULL;

ALTER TABLE public.messages
  ALTER COLUMN sender_id DROP NOT NULL;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_user1_id_fkey
  FOREIGN KEY (user1_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT conversations_user2_id_fkey
  FOREIGN KEY (user2_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- A surviving participant can still read a retained thread. No new
-- conversation with a NULL participant can be written by a browser caller.
CREATE POLICY conversations_survivor_select
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY messages_retained_thread_select
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

CREATE POLICY messages_insert_live_participants_only
ON public.messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.user1_id IS NOT NULL
      AND c.user2_id IS NOT NULL
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
      AND NOT private.is_interaction_blocked(
        auth.uid(),
        CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END
      )
  )
);

CREATE OR REPLACE FUNCTION public.prevent_deleted_user_message_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  participant_one uuid;
  participant_two uuid;
BEGIN
  SELECT c.user1_id, c.user2_id
    INTO participant_one, participant_two
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF TG_OP = 'UPDATE' AND NEW.sender_id IS NULL AND current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF participant_one IS NULL OR participant_two IS NULL THEN
    RAISE EXCEPTION 'Retained conversations are read-only';
  END IF;

  IF caller_id IS NULL OR NEW.sender_id IS DISTINCT FROM caller_id THEN
    RAISE EXCEPTION 'Message sender must match the authenticated user';
  END IF;

  IF private.is_interaction_blocked(
    caller_id,
    CASE WHEN participant_one = caller_id THEN participant_two ELSE participant_one END
  ) THEN
    RAISE EXCEPTION 'Blocked participants cannot send messages';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_deleted_user_message_writes ON public.messages;
CREATE TRIGGER prevent_deleted_user_message_writes
BEFORE INSERT OR UPDATE OF sender_id, conversation_id
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_deleted_user_message_writes();

-- Safety evidence deliberately stores source UUIDs without foreign keys to
-- public conversations/messages, so ordinary account deletion cannot be
-- blocked by evidence retention.
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.safety_cases (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  subject_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS private.safety_evidence (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES private.safety_cases(id) ON DELETE CASCADE,
  subject_user_id uuid NOT NULL,
  source_conversation_id uuid,
  source_message_id uuid,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE IF NOT EXISTS private.legal_holds (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  subject_user_id uuid NOT NULL,
  case_id uuid REFERENCES private.safety_cases(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  released_at timestamptz
);

CREATE TABLE IF NOT EXISTS private.account_deletion_operations (
  operation_key text PRIMARY KEY,
  subject_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  phase text NOT NULL DEFAULT 'pending',
  failure_code text,
  started_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  completed_at timestamptz
);

ALTER TABLE private.safety_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.safety_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.account_deletion_operations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  private.safety_cases,
  private.safety_evidence,
  private.legal_holds,
  private.account_deletion_operations
FROM anon, authenticated;

COMMIT;
