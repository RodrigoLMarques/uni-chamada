export const CLASS_SESSION_STATUSES = ['SCHEDULED', 'OPEN', 'CLOSED', 'CONFIRMED'] as const;

export type ClassSessionStatus = (typeof CLASS_SESSION_STATUSES)[number];

export type ClassSessionEntity = {
  id: bigint;
  courseId: bigint;
  startsAt: Date;
  openedAt?: Date | null;
  closedAt?: Date | null;
  confirmedAt?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyM?: number | null;
};

export function statusOf(session: ClassSessionEntity): ClassSessionStatus {
  if (session.confirmedAt) return 'CONFIRMED';
  if (session.closedAt) return 'CLOSED';
  if (session.openedAt) return 'OPEN';
  return 'SCHEDULED';
}
