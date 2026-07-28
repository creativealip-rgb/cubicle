export type TimerSegmentRange = {
  startedAt: Date;
  endedAt: Date | null;
};

export function calculateSegmentMinutes(segments: TimerSegmentRange[]): number {
  const milliseconds = segments.reduce((total, segment) => {
    if (!segment.endedAt) return total;
    return total + Math.max(0, segment.endedAt.getTime() - segment.startedAt.getTime());
  }, 0);
  return Math.floor(milliseconds / 60_000);
}

export function staleTimerNeedsCorrection(startedAt: Date, now = new Date()): boolean {
  return now.getTime() - startedAt.getTime() > 24 * 60 * 60 * 1000;
}
