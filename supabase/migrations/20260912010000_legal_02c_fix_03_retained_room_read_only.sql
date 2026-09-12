BEGIN;

-- Keep retained rooms readable while denying normal preview updates after
-- either participant has been removed. Trusted service/database maintenance
-- continues to bypass this browser-facing RLS guard.
CREATE POLICY conversations_live_update_only
ON public.conversations
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  user1_id IS NOT NULL
  AND user2_id IS NOT NULL
  AND (auth.uid() = user1_id OR auth.uid() = user2_id)
)
WITH CHECK (
  user1_id IS NOT NULL
  AND user2_id IS NOT NULL
  AND (auth.uid() = user1_id OR auth.uid() = user2_id)
);

COMMIT;