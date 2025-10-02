import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Limpeza de eventos e auditorias antigos
// Parâmetros opcionais: retentionDays (default 90)
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'supabaseAdmin não configurado' }, { status: 500 });
  }
  const retentionDays = 90;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const results: Record<string, unknown> = {};
  try {
    // stripe_webhook_events
    const { error: delWebhookErr, count: webhookCount } = await supabaseAdmin
      .from('stripe_webhook_events')
      .delete({ count: 'exact' })
      .lt('processed_at', cutoff)
      .neq('status', 'pending');
    if (delWebhookErr) results.webhookError = delWebhookErr.message; else results.webhookDeleted = webhookCount;

    // subscription_reconciliation_audit
    const { error: delReconErr, count: reconCount } = await supabaseAdmin
      .from('subscription_reconciliation_audit')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff);
    if (delReconErr) results.reconError = delReconErr.message; else results.reconDeleted = reconCount;

    return NextResponse.json({ ok: true, cutoff, ...results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
