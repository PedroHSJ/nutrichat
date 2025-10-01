import { NextResponse } from 'next/server';
import { destroyAdminSession } from '@/lib/admin-auth';

export async function POST(request: Request) {
  await destroyAdminSession();
  return NextResponse.json({ success: true });
}
