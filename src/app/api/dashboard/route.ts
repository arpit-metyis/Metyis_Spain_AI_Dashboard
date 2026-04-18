import { NextResponse } from 'next/server';
import { metyisControlTower } from '@/lib/metyis-control-tower';

export async function GET() {
  return NextResponse.json({ dashboard: metyisControlTower });
}
