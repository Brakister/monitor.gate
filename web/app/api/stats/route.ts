import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, applyRateLimit } from '@/lib/request';
import { getStats } from '@/lib/stats';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = req.headers.get('x-forwarded-for') ?? userId;
  if (!applyRateLimit(`stats:${client}`, 240, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const day = searchParams.get('day') ?? undefined;
  const month = searchParams.get('month') ?? undefined;

  const result = await getStats({ userId, day, month });
  return NextResponse.json(result);
}
