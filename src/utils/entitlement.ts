export type EntitlementStatus = 'loading' | 'ready' | 'error' | 'unauthenticated';

export interface TrialEligibility {
  status: 'database-blocked';
  reason: 'missing-persisted-trial-timestamp';
}

export const getTrialEligibility = (): TrialEligibility => ({
  status: 'database-blocked',
  reason: 'missing-persisted-trial-timestamp',
});

export const canAccessVipFeatures = (
  entitlementStatus: EntitlementStatus,
  isVip: boolean,
): boolean => entitlementStatus === 'ready' && isVip;
