import { supabase } from '@/supabaseClient';

const normalizePhotoUrls = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.filter((photo): photo is string => typeof photo === 'string' && photo.trim().length > 0)
    : []
);

export const loadOwnerPrivatePhotos = async (
  profileId: string,
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('profile_private_photos')
    .select('private_photos')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return normalizePhotoUrls(data?.private_photos);
};

export const persistOwnerPrivatePhotos = async (
  profileId: string,
  photos: readonly string[],
): Promise<void> => {
  const privatePhotos = normalizePhotoUrls(photos);

  const { error } = await supabase
    .from('profile_private_photos')
    .upsert({
      profile_id: profileId,
      private_photos: privatePhotos,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
};
