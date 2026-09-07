export const isValidProfileName = (value: string): boolean => {
  const name = value.trim();
  return /^[\p{Script=Han}]{1,7}$/u.test(name) || /^[A-Za-z]{1,14}$/.test(name);
};

export const getPublicProfilePhoto = (
  publicPhotos?: readonly unknown[],
  avatarUrl?: unknown,
): string | undefined => {
  const firstPhoto = publicPhotos?.find(
    (photo): photo is string => typeof photo === 'string' && photo.trim().length > 0,
  );

  if (firstPhoto) return firstPhoto;
  return typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 ? avatarUrl : undefined;
};
