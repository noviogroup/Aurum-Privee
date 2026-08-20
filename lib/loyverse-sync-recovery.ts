export const LOYVERSE_SYNC_MAX_ATTEMPTS = 8;
export const LOYVERSE_SYNC_STALE_AFTER_MS = 15 * 60 * 1000;

type SyncCandidate = {
  status: string | null | undefined;
  attempts: number | string | null | undefined;
  claimedAt: string | null | undefined;
};

export function isLoyverseSyncEligible(candidate: SyncCandidate, now = new Date()) {
  const attempts = Number(candidate.attempts || 0);
  if (!Number.isInteger(attempts) || attempts < 0 || attempts >= LOYVERSE_SYNC_MAX_ATTEMPTS) return false;
  if (candidate.status === "pending" || candidate.status === "failed") return true;
  if (candidate.status !== "processing") return false;
  if (!candidate.claimedAt) return true;
  const claimedAt = Date.parse(candidate.claimedAt);
  return !Number.isFinite(claimedAt) || claimedAt <= now.getTime() - LOYVERSE_SYNC_STALE_AFTER_MS;
}

export function isLoyverseSyncStuck(candidate: SyncCandidate, now = new Date()) {
  if (candidate.status !== "processing") return false;
  if (!candidate.claimedAt) return true;
  const claimedAt = Date.parse(candidate.claimedAt);
  return !Number.isFinite(claimedAt) || claimedAt <= now.getTime() - LOYVERSE_SYNC_STALE_AFTER_MS;
}

export function isLoyverseSyncExhausted(candidate: SyncCandidate) {
  return ["pending", "processing", "failed"].includes(candidate.status || "")
    && Number(candidate.attempts || 0) >= LOYVERSE_SYNC_MAX_ATTEMPTS;
}
