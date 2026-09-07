import { supabase } from '@/supabaseClient';

export type LikeWithCooldownResult = 'sent' | 'cooldown' | 'in-flight';

const inFlightInteractions = new Set<string>();

/**
 * Sends a like through the server-owned cooldown and notification contract.
 * A false response is the RPC's documented cooldown result, not a success.
 */
export async function sendLikeWithCooldown(targetId: string): Promise<LikeWithCooldownResult> {
  const interactionKey = `like:${targetId}`;
  if (inFlightInteractions.has(interactionKey)) {
    return 'in-flight';
  }

  inFlightInteractions.add(interactionKey);
  try {
    const { data, error } = await supabase.rpc('send_like_with_cooldown', {
      target_id: targetId,
    });

    if (error) {
      throw error;
    }

    return data === true ? 'sent' : 'cooldown';
  } finally {
    inFlightInteractions.delete(interactionKey);
  }
}

/**
 * Boosts a profile through the server-owned popularity and notification contract.
 */
export async function boostUserProfile(targetId: string): Promise<boolean> {
  const interactionKey = `boost:${targetId}`;
  if (inFlightInteractions.has(interactionKey)) {
    return false;
  }

  inFlightInteractions.add(interactionKey);
  try {
    const { error } = await supabase.rpc('boost_user_profile', {
      target_id: targetId,
    });

    if (error) {
      throw error;
    }

    return true;
  } finally {
    inFlightInteractions.delete(interactionKey);
  }
}
