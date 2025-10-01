import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Limpa sessões admin expiradas e revogadas (segurança e higiene)
export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: 'supabaseAdmin não configurado' }, { status: 500 });
  try {
    // Executa função de limpeza se existir
    const { error: funcErr } = await supabaseAdmin.rpc('cleanup_admin_sessions');
    if (funcErr) {
      // fallback manual
      const { error: delErr, count } = await supabaseAdmin
        .from('admin_sessions')
        .delete({ count: 'exact' })
        .or('expires_at.lt.' + new Date().toISOString() + ',revoked_at.not.is.null');
      if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, removed: count, fallback: true });
    }
    return NextResponse.json({ ok: true, function: true });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
