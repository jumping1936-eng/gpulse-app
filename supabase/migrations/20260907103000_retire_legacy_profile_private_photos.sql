-- Protected photos are stored in public.profile_private_photos.
-- This legacy column was retired after production verification found zero populated rows.
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS private_photos;
