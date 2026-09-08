export const isValidProfileName = (value: string): boolean => {
  const name = value.trim();
  return /^[\p{Script=Han}]{1,7}$/u.test(name) || /^[A-Za-z]{1,14}$/.test(name);
};

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
