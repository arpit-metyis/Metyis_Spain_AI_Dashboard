import { NextResponse } from 'next/server';
import { withRepositoryFallback } from '@/lib/data/repository';

export async function GET() {
  const repository = await withRepositoryFallback(repo => repo.getHealth());
  return NextResponse.json({ app: 'Metyis Spain AI Dashboard', status: 'ok', repository, timestamp: new Date().toISOString() });
}
