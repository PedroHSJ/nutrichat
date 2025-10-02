import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

type StatusCounts = Record<string, number>;

export async function GET() {
  if (!(await isAdminSession(undefined))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
  }
  try {
    const rpc = await supabaseAdmin.rpc('subscription_status_counts').maybeSingle();
    const counts: StatusCounts = (rpc as { data?: StatusCounts } | null)?.data || {};
    return NextResponse.json({ success: true, counts });
  } catch (e) {
    console.error('[Admin status-counts] erro', e);
    return NextResponse.json({ error: 'Falha ao obter contagens' }, { status: 500 });
  }
}
