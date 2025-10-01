import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Métricas básicas para dashboard admin
export async function GET(request: Request) {
  try {
  if (!(await isAdminSession(undefined))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if(!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    // Paralelizar queries
    const [subsCountRes, activePlansRes, recentEventsRes, reconcileActionsRes, subsStatusRes] = await Promise.all([
      supabaseAdmin.from('user_subscriptions').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('subscription_plans').select('id').eq('active', true),
      supabaseAdmin.from('stripe_webhook_events').select('event_type, created_at').order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('subscription_reconciliation_audit').select('*').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.rpc('subscription_status_counts').maybeSingle()
    ]);

    const subsCount = subsCountRes.count || 0;
    const activePlans = activePlansRes.data || [];

    // Contagem por tipo de evento
    const eventTypeCounts: Record<string, number> = {};
    (recentEventsRes.data || []).forEach((e: any) => {
      eventTypeCounts[e.event_type] = (eventTypeCounts[e.event_type] || 0) + 1;
    });

    // Contagem rápida de ações de reconciliação nas últimas 24h
    const now = Date.now();
    let reconcileLast24h = 0;
    (reconcileActionsRes.data || []).forEach((a: any) => {
      if (now - new Date(a.created_at).getTime() < 24 * 60 * 60 * 1000) reconcileLast24h++;
    });

    let statusCounts: Record<string, number> = {};
    if (subsStatusRes && (subsStatusRes as any).data) {
      statusCounts = (subsStatusRes as any).data as Record<string, number>;
    } else {
      // fallback simples iterando (ineficiente se base grande – pode otimizar com view ou rpc)
      // ignorado aqui para simplicidade
    }

    return NextResponse.json({
      subscriptions: { total: subsCount, statuses: statusCounts },
      plans: { active: activePlans.length },
      events: { recent: recentEventsRes.data || [], counts: eventTypeCounts },
      reconciliation: { lastActions: reconcileActionsRes.data || [], actionsLast24h: reconcileLast24h }
    });
  } catch (err:any) {
    console.error('[Admin Metrics] erro', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
