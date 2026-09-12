BEGIN;

-- Browser clients only update the conversation preview fields. Removing the
-- table-level grant prevents column-level grants from being widened by an
-- inherited UPDATE privilege. Trusted service/database maintenance is left
-- unchanged, including the FK-driven ON DELETE SET NULL action.
REVOKE UPDATE ON TABLE public.conversations FROM PUBLIC, anon, authenticated;

GRANT UPDATE (last_message, last_message_time)
ON TABLE public.conversations
TO authenticated;

COMMIT;