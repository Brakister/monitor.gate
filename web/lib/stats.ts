import { prisma } from './prisma';

export type StatsQuery = {
  userId: string;
  month?: string;
  day?: string;
};

function toDayRange(day?: string): { start: Date; end: Date } | null {
  if (!day) return null;
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function toMonthRange(month?: string): { start: Date; end: Date } | null {
  if (!month) return null;
  const [year, monthPart] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthPart - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthPart, 1, 0, 0, 0));
  return { start, end };
}

export async function getStats(query: StatsQuery) {
  const dayRange = toDayRange(query.day);
  const monthRange = toMonthRange(query.month);
  const where = {
    userId: query.userId,
    ...(dayRange
      ? { startUtc: { gte: dayRange.start, lt: dayRange.end } }
      : monthRange
        ? { startUtc: { gte: monthRange.start, lt: monthRange.end } }
        : {})
  };

  const [activities, appRank, siteRank] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { startUtc: 'asc' },
      select: {
        id: true,
        appName: true,
        processName: true,
        windowTitle: true,
        urlDomain: true,
        durationMs: true,
        startUtc: true,
        endUtc: true
      }
    }),
    prisma.activity.groupBy({
      by: ['appName'],
      where,
      _sum: { durationMs: true },
      orderBy: { _sum: { durationMs: 'desc' } },
      take: 15
    }),
    prisma.activity.groupBy({
      by: ['urlDomain'],
      where: { ...where, urlDomain: { not: null } },
      _sum: { durationMs: true },
      orderBy: { _sum: { durationMs: 'desc' } },
      take: 15
    })
  ]);

  const totalMs = activities.reduce((acc: number, a: { durationMs: number }) => acc + a.durationMs, 0);

  const byDayMap = new Map<string, number>();
  for (const item of activities) {
    const key = item.startUtc.toISOString().slice(0, 10);
    byDayMap.set(key, (byDayMap.get(key) ?? 0) + item.durationMs);
  }

  const byDay = [...byDayMap.entries()].map(([date, durationMs]) => ({ date, durationMs }));
  byDay.sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalMs,
    averageDailyMs: byDay.length ? Math.round(totalMs / byDay.length) : 0,
    timeline: activities,
    byDay,
    apps: appRank.map((a: { appName: string; _sum: { durationMs: number | null } }) => ({
      name: a.appName,
      durationMs: a._sum.durationMs ?? 0
    })),
    sites: siteRank
      .filter((s: { urlDomain: string | null }) => s.urlDomain)
      .map((s: { urlDomain: string | null; _sum: { durationMs: number | null } }) => ({
        name: s.urlDomain as string,
        durationMs: s._sum.durationMs ?? 0
      }))
  };
}
