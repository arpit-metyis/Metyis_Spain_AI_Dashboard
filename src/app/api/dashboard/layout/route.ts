import { NextRequest, NextResponse } from 'next/server';
import { withRepositoryFallback } from '@/lib/data/repository';

export async function GET(request: NextRequest) {
  const dashboardId = request.nextUrl.searchParams.get('dashboardId');
  if (!dashboardId) return NextResponse.json({ error: 'dashboardId is required' }, { status: 400 });
  const layout = await withRepositoryFallback(repo => repo.getDashboardLayout(dashboardId));
  return NextResponse.json(layout ?? { tabs: null });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!body.dashboardId || !Array.isArray(body.tabs)) return NextResponse.json({ error: 'dashboardId and tabs are required' }, { status: 400 });
  await withRepositoryFallback(repo => repo.saveDashboardLayout(body.dashboardId, body.tabs));
  return NextResponse.json({ ok: true });
}
