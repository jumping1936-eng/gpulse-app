export const isValidProfileName = (value: string): boolean => {
  const name = value.trim();
  return /^[\p{Script=Han}]{1,7}$/u.test(name) || /^[A-Za-z]{1,14}$/.test(name);
};

// Production-verified public.profiles columns used by public profile cards.
// Sharing this contract prevents a stale column on one surface from turning
// real profile data into a misleading empty state.
export const PUBLIC_PROFILE_FIELDS = [
  'id',
  'full_name',
  'age',
  'avatar_url',
  'public_photos',
  'location',
  'is_vip',
  'bio',
  'tribe',
  'height',
  'role',
  'looking_for',
].join(', ');

export const OWN_PROFILE_FIELDS = [
  'id',
  'full_name',
  'age',
  'location',
  'height',
  'weight',
  'role',
  'tribe',
  'bio',
  'looking_for',
  'hide_distance',
  'avatar_url',
  'public_photos',
].join(', ');

export const getPublicProfilePhoto = (
  publicPhotos?: readonly unknown[],
  avatarUrl?: unknown,
): string | undefined => {
  const firstPhoto = publicPhotos?.[0];

  if (typeof firstPhoto === 'string' && firstPhoto.trim().length > 0) return firstPhoto;
  return typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 ? avatarUrl : undefined;
};

export const getPublicProfileGallery = (
  publicPhotos?: readonly unknown[],
  avatarUrl?: unknown,
): string[] => {
  const primaryPhoto = getPublicProfilePhoto(publicPhotos, avatarUrl);
  if (!primaryPhoto) return [];

  if (typeof publicPhotos?.[0] !== 'string' || publicPhotos[0].trim().length === 0) {
    return [primaryPhoto];
  }

  const uniquePhotos = new Set<string>();
  for (const photo of publicPhotos) {
    if (typeof photo === 'string' && photo.trim().length > 0) {
      uniquePhotos.add(photo);
    }
  }

  return [...uniquePhotos];
};
