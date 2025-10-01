import { NextResponse } from 'next/server';
import { SubscriptionService, stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Cron: Reconciliação periódica com Stripe
 * Objetivos:
 *  - Garantir que assinaturas ativas/trialing no Stripe existam no banco
 *  - Atualizar períodos e status se divergirem
 *  - Registrar eventos de correção
 */
async function logAudit(action: string, data: Record<string, any>) {
  try {
    if (!supabaseAdmin) return;
    const record = { action, ...data };
    await supabaseAdmin.from('subscription_reconciliation_audit').insert(record);
  } catch (e) {
    // Silenciar erros de auditoria para não interromper reconciliação
    console.warn('[Reconcile][Audit] Falha ao registrar auditoria', e);
  }
}

export async function GET() {
  const startedAt = Date.now();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'supabaseAdmin não configurado' }, { status: 500 });
  }

  const repaired: any[] = [];
  const skipped: any[] = [];
  const errors: any[] = [];
  const divergences: any[] = [];

  try {
    // Paginação Stripe: até 100 por chamada
    // Vamos buscar active e trialing em duas passagens (Stripe não permite múltiplos statuses juntos em list classic)
    const statuses: Array<'active' | 'trialing'> = ['active', 'trialing'];

    for (const status of statuses) {
      let hasMore = true;
      let startingAfter: string | undefined = undefined;

      while (hasMore) {
  const subs: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
          status,
          limit: 50,
          starting_after: startingAfter,
        });

        for (const s of subs.data) {
          try {
            const subId = s.id;
            const priceId = s.items.data[0]?.price?.id;
            if (!priceId) {
              skipped.push({ subId, reason: 'Sem priceId' });
              continue;
            }

            // Verificar existência no banco
            const { data: existing, error: existingErr } = await supabaseAdmin
              .from('user_subscriptions')
              .select('id, user_id, status, current_period_end, current_period_start, plan_id')
              .eq('stripe_subscription_id', subId)
              .single();

            if (existingErr && existingErr.code !== 'PGRST116') {
              throw existingErr;
            }

            // Descobrir plano
            const { data: planRow } = await supabaseAdmin
              .from('subscription_plans')
              .select('id')
              .eq('stripe_price_id', priceId)
              .eq('active', true)
              .single();

            if (!planRow) {
              skipped.push({ subId, reason: 'Plano não encontrado para price ' + priceId });
              continue;
            }

            // Obter user via customer -> email -> userId (fallback se não temos user)
            const customerId = s.customer as string;
            const customer = await stripe.customers.retrieve(customerId);
            const email = (customer as any).email as string | undefined;
            if (!email) {
              skipped.push({ subId, reason: 'Customer sem email' });
              continue;
            }

            const { data: userIdData, error: userLookupError } = await supabaseAdmin
              .rpc('get_user_id_by_email', { user_email: email });

            if (userLookupError || !userIdData) {
              skipped.push({ subId, reason: 'Usuário não encontrado p/ email ' + email });
              continue;
            }

            const userId = userIdData as string;

            const firstItem = s.items.data[0];
            const periodStart = firstItem?.current_period_start ? new Date(firstItem.current_period_start * 1000) : null;
            const periodEnd = firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000) : null;
            if (!periodStart || !periodEnd) {
              skipped.push({ subId, reason: 'Períodos ausentes' });
              continue;
            }

            const mappedStatus = SubscriptionService.mapStripeStatus(s.status);
            const periodEndDbTime = existing ? new Date(existing.current_period_end).getTime() : null;
            const periodDiff = existing ? Math.abs(periodEndDbTime! - periodEnd.getTime()) > 1000 : false;
            const statusDiff = existing ? existing.status !== mappedStatus : false;

            if (!existing) {
              divergences.push({ subId, reason: 'missing', statusStripe: mappedStatus });
              const { error: insertError } = await supabaseAdmin
                .from('user_subscriptions')
                .insert({
                  user_id: userId,
                  plan_id: planRow.id,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subId,
                  status: mappedStatus,
                  current_period_start: periodStart.toISOString(),
                  current_period_end: periodEnd.toISOString(),
                  trial_start: s.trial_start ? new Date(s.trial_start * 1000).toISOString() : null,
                  trial_end: s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null,
                  metadata: {}
                })
                .select('id')
                .single();
              if (insertError) {
                errors.push({ subId, error: insertError.message });
                await logAudit('error', {
                  stripe_subscription_id: subId,
                  stripe_customer_id: customerId,
                  user_id: userId,
                  plan_id: planRow.id,
                  status_stripe: mappedStatus,
                  reason: 'insert_failed',
                  error: insertError.message
                });
              } else {
                repaired.push({ subId, action: 'created' });
                await logAudit('created', {
                  stripe_subscription_id: subId,
                  stripe_customer_id: customerId,
                  user_id: userId,
                  plan_id: planRow.id,
                  status_stripe: mappedStatus,
                  period_end_stripe: periodEnd.toISOString(),
                  reason: 'missing'
                });
              }
              continue;
            }

            if (periodDiff || statusDiff) {
              divergences.push({ subId, reason: 'mismatch', periodDiff, statusDiff });
              const { error: updateError } = await supabaseAdmin
                .from('user_subscriptions')
                .update({
                  status: mappedStatus,
                  current_period_start: periodStart.toISOString(),
                  current_period_end: periodEnd.toISOString(),
                  trial_start: s.trial_start ? new Date(s.trial_start * 1000).toISOString() : null,
                  trial_end: s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null,
                  updated_at: new Date().toISOString()
                })
                .eq('stripe_subscription_id', subId);
              if (updateError) {
                errors.push({ subId, error: updateError.message });
                await logAudit('error', {
                  stripe_subscription_id: subId,
                  stripe_customer_id: customerId,
                  user_id: userId,
                  plan_id: planRow.id,
                  status_stripe: mappedStatus,
                  status_db: existing.status,
                  period_end_stripe: periodEnd.toISOString(),
                  period_end_db: existing.current_period_end,
                  reason: 'update_failed',
                  error: updateError.message
                });
              } else {
                repaired.push({ subId, action: 'updated' });
                await logAudit('updated', {
                  stripe_subscription_id: subId,
                  stripe_customer_id: customerId,
                  user_id: userId,
                  plan_id: planRow.id,
                  status_stripe: mappedStatus,
                  status_db: existing.status,
                  period_end_stripe: periodEnd.toISOString(),
                  period_end_db: existing.current_period_end,
                  reason: 'mismatch'
                });
              }
            } else {
              skipped.push({ subId, reason: 'Up-to-date' });
              await logAudit('skipped', {
                stripe_subscription_id: subId,
                stripe_customer_id: customerId,
                user_id: userId,
                plan_id: planRow.id,
                status_stripe: mappedStatus,
                status_db: existing.status,
                period_end_stripe: periodEnd.toISOString(),
                period_end_db: existing.current_period_end,
                reason: 'uptodate'
              });
            }
          } catch (innerError: any) {
            errors.push({ subId: (innerError && innerError.subId) || 'unknown', error: innerError.message || String(innerError) });
          }
        }

        hasMore = subs.has_more;
        startingAfter = hasMore ? subs.data[subs.data.length - 1].id : undefined;
      }
    }

    const durationMs = Date.now() - startedAt;
    return NextResponse.json({
      ok: true,
      durationMs,
      repairedCount: repaired.length,
      divergencesCount: divergences.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      repaired,
      divergences: divergences.slice(0, 50),
      skipped: skipped.slice(0, 30),
      errors: errors.slice(0, 30)
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
