import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabaseClient';

export type DistanceBucket = '<25 km' | '25–100 km' | '100+ km';

type DistanceBucketRow = {
  target_profile_id: string;
  distance_bucket: DistanceBucket;
};

const MAX_TARGETS_PER_REQUEST = 200;
const distanceBuckets = new Set<DistanceBucket>(['<25 km', '25–100 km', '100+ km']);

function isDistanceBucketRow(value: unknown): value is DistanceBucketRow {
  if (typeof value !== 'object' || value === null) return false;

  const row = value as Record<string, unknown>;
  return typeof row.target_profile_id === 'string'
    && typeof row.distance_bucket === 'string'
    && distanceBuckets.has(row.distance_bucket as DistanceBucket);
}

export function useProfileDistanceBuckets(profileIds: readonly string[]): Record<string, DistanceBucket> {
  const { user } = useAuth();
  const requestKey = useMemo(
    () => [...new Set(profileIds.filter((id) => typeof id === 'string' && id.length > 0))].join('|'),
    [profileIds],
  );

  const requestedIds = useMemo(
    () => requestKey.length > 0 ? requestKey.split('|') : [],
    [requestKey],
  );
  const [bucketsByProfileId, setBucketsByProfileId] = useState<Record<string, DistanceBucket>>({});

  useEffect(() => {
    let cancelled = false;

    const loadDistanceBuckets = async () => {
      const eligibleIds = user?.id
        ? requestedIds.filter((profileId) => profileId !== user.id)
        : [];

      if (eligibleIds.length === 0) {
        if (!cancelled) setBucketsByProfileId({});
        return;
      }

      const nextBuckets: Record<string, DistanceBucket> = {};

      try {
        for (let start = 0; start < eligibleIds.length; start += MAX_TARGETS_PER_REQUEST) {
          const targetProfileIds = eligibleIds.slice(start, start + MAX_TARGETS_PER_REQUEST);
          const { data, error } = await supabase.rpc('get_profile_distance_buckets', {
            target_profile_ids: targetProfileIds,
          });

          if (error) throw error;

          if (Array.isArray(data)) {
            for (const row of data) {
              if (isDistanceBucketRow(row)) {
                nextBuckets[row.target_profile_id] = row.distance_bucket;
              }
            }
          }
        }

        if (!cancelled) setBucketsByProfileId(nextBuckets);
      } catch (error) {
        console.error('載入距離區間失敗:', error);
        if (!cancelled) setBucketsByProfileId({});
      }
    };

    void loadDistanceBuckets();

    return () => {
      cancelled = true;
    };
  }, [requestedIds, user?.id]);

  return bucketsByProfileId;
}
