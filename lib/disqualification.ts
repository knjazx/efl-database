export interface DisqualifiableEntity {
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
}

export interface BanStatus {
  isBanned: boolean;
  isPermanent: boolean;
  remainingText: string | null;
  expiresAt: string | null;
  reason: string | null;
}

/**
 * Dynamically computes active ban status and remaining duration.
 */
export function getBanStatus(entity?: DisqualifiableEntity | null): BanStatus {
  if (!entity || !entity.isDisqualified) {
    return {
      isBanned: false,
      isPermanent: false,
      remainingText: null,
      expiresAt: null,
      reason: null,
    };
  }

  const reason = entity.disqualifyReason || "Нарушение регламента лиги";

  // Permanent ban (no until date)
  if (!entity.disqualifiedUntil) {
    return {
      isBanned: true,
      isPermanent: true,
      remainingText: "Бессрочно",
      expiresAt: null,
      reason,
    };
  }

  const untilDate = new Date(entity.disqualifiedUntil);
  const now = new Date();
  const diffMs = untilDate.getTime() - now.getTime();

  // If expired naturally, treat as not banned
  if (diffMs <= 0) {
    return {
      isBanned: false,
      isPermanent: false,
      remainingText: null,
      expiresAt: null,
      reason: null,
    };
  }

  // Format remaining time (Days, Hours, Minutes)
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  let remainingText = "";
  if (days > 0) {
    remainingText = `${days}д ${hours}ч`;
  } else if (hours > 0) {
    remainingText = `${hours}ч ${minutes}м`;
  } else {
    remainingText = `${Math.max(1, minutes)}м`;
  }

  return {
    isBanned: true,
    isPermanent: false,
    remainingText: `Осталось ${remainingText}`,
    expiresAt: untilDate.toISOString(),
    reason,
  };
}
