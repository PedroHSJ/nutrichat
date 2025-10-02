import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface SubsCountResult { count: number | null }
interface IdRow { id: string }
interface WebhookEventRow { event_type: string; created_at: string }
interface ReconciliationRow { created_at: string }
type StatusCountsRow = Record<string, number>
interface SafeWrap<T> { ok: boolean; value: T; error?: unknown }

// Métricas básicas para dashboard admin
export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === '1';
  try {
    if (!(await isAdminSession(undefined))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<SafeWrap<T>> {
      try { const value = await fn(); return { ok: true, value }; } catch (e) { if (debug) console.warn(`[metrics:${label}]`, (e as Error).message || e); return { ok: false, value: fallback, error: e }; }
    }

    const admin = supabaseAdmin!;
    // Fallbacks modelam apenas campos usados
    const [subsCountWrap, plansWrap, eventsWrap, reconWrap, statusWrap] = await Promise.all([
      safe('subsCount', async () => admin.from('user_subscriptions').select('id', { count: 'exact', head: true }), { count: 0 } as SubsCountResult),
      safe('plans', async () => admin.from('subscription_plans').select('id').eq('active', true), { data: [] as IdRow[], error: null, count: null, status: 200, statusText: 'OK' }),
      safe('events', async () => admin.from('stripe_webhook_events').select('event_type, created_at').order('created_at', { ascending: false }).limit(20), { data: [] as WebhookEventRow[], error: null, count: null, status: 200, statusText: 'OK' }),
      safe('reconciliation', async () => admin.from('subscription_reconciliation_audit').select('created_at').order('created_at', { ascending: false }).limit(10), { data: [] as ReconciliationRow[], error: null, count: null, status: 200, statusText: 'OK' }),
      safe('statusCounts', async () => admin.rpc('subscription_status_counts').maybeSingle(), { data: {} as StatusCountsRow, error: null, count: null, status: 200, statusText: 'OK' })
    ]);

  const subsCount = (subsCountWrap.value as SubsCountResult).count || 0;
  const activePlans = (plansWrap.value as { data: IdRow[] }).data || [];
  const recentEvents = (eventsWrap.value as { data: WebhookEventRow[] }).data || [];
  const reconciliation = (reconWrap.value as { data: ReconciliationRow[] }).data || [];
  const statusCounts: StatusCountsRow = (statusWrap.value as { data: StatusCountsRow }).data || {};

    const eventTypeCounts: Record<string, number> = {};
    for (const e of recentEvents) {
      eventTypeCounts[e.event_type] = (eventTypeCounts[e.event_type] || 0) + 1;
    }

    const now = Date.now();
    let reconcileLast24h = 0;
    for (const a of reconciliation) {
      if (a.created_at && now - new Date(a.created_at).getTime() < 86_400_000) reconcileLast24h++;
    }

    return NextResponse.json({
      subscriptions: { total: subsCount, statuses: statusCounts },
      plans: { active: activePlans.length },
      events: { recent: recentEvents, counts: eventTypeCounts },
      reconciliation: { lastActions: reconciliation, actionsLast24h: reconcileLast24h },
      debug: debug ? {
        subsCountQueryOk: subsCountWrap.ok,
        plansQueryOk: plansWrap.ok,
        eventsQueryOk: eventsWrap.ok,
        reconciliationQueryOk: reconWrap.ok,
        statusCountsQueryOk: statusWrap.ok
      } : undefined
    });
  } catch (err) {
    console.error('[Admin Metrics] erro fatal', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
