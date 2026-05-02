import { useState, useEffect } from 'react';

// Decay constant – should stay in sync with backend config (LAMBDA_DECAY)
const LAMBDA_DECAY = 0.005;
export const VOTING_REPUTATION_THRESHOLD = 10;

export function getDecayedReputation(user) {
  if (!user) return 0;
  const last = user.lastValidatedActivity ? new Date(user.lastValidatedActivity) : new Date();
  const elapsedMs = Date.now() - last.getTime();
  const tHours = elapsedMs / (1000 * 60 * 60);
  return Number((user.reputation * Math.exp(-LAMBDA_DECAY * tHours)).toFixed(2));
}

export function canVoteWithDecay(user) {
  return getDecayedReputation(user) >= VOTING_REPUTATION_THRESHOLD;
}

/**
 * React hook that returns the live, time‑decayed reputation for a user.
 * Formula: R_live = R_base * exp(-λ * tHours)
 *   – λ  : decay constant (default 0.005)
 *   – t  : hours elapsed since lastValidatedActivity
 * The hook updates every second for a smooth UI experience.
 *
 * @param {Object|null} user The logged‑in user object (may be null).
 * @returns {number} Live reputation rounded to two decimal places.
 */
export function useDecay(user) {
  const [liveRep, setLiveRep] = useState(() => getDecayedReputation(user));

  useEffect(() => {
    if (!user) return undefined;
    const interval = setInterval(() => {
      setLiveRep(getDecayedReputation(user));
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  return liveRep;
}
