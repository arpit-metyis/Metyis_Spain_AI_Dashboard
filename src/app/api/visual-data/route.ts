import { NextRequest, NextResponse } from 'next/server';
import { withRepositoryFallback } from '@/lib/data/repository';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const widgetType = searchParams.get('widgetType');
  if (!widgetType) return NextResponse.json({ error: 'widgetType is required' }, { status: 400 });
  const data = await withRepositoryFallback(repo => repo.getVisualData({
    widgetType,
    kpiKey: searchParams.get('kpiKey'),
    geo: searchParams.get('geo'),
    businessUnit: searchParams.get('businessUnit'),
    product: searchParams.get('product'),
    timeframe: searchParams.get('timeframe'),
  }));
  return NextResponse.json(data);
}
