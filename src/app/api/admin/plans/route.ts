import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecret ? new Stripe(stripeSecret as string) : null;

// GET: lista planos com preços atuais e histórico de preços
export async function GET(request: Request) {
  if (!(await isAdminSession(undefined))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if(!supabaseAdmin) return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });

  const { data: plans, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Buscar preços versionados
  // Nova tabela versionada usa colunas amount_cents e billing_interval
  const { data: pricesRaw, error: priceErr } = await supabaseAdmin
    .from('subscription_plan_prices')
    .select('*')
    .order('created_at', { ascending: false });
  if (priceErr) return NextResponse.json({ error: priceErr.message }, { status: 500 });

  // Mapear para o formato esperado pelo frontend (price_cents / interval)
  const byPlan = (plans||[]).map(p => {
    const versions = (pricesRaw||[])
      .filter(pr => pr.plan_id === p.id)
      .map(pr => ({
        id: pr.id,
        price_cents: pr.amount_cents,
        interval: pr.billing_interval,
        is_current: pr.is_current,
        created_at: pr.created_at
      }));
    const current = versions.find(v => v.is_current);
    return {
      ...p,
      // Campos sintéticos para manter UI existente funcionando
      price_cents: current?.price_cents || 0,
      interval: current?.interval || 'month',
      price_versions: versions
    };
  });

  return NextResponse.json({ plans: byPlan });
}

// PUT: atualiza plano criando novo price na Stripe e marcando antigo como não-current
// Body: { plan_id, new_price_cents, interval, features?, name? }
export async function PUT(request: Request) {
  if (!(await isAdminSession(undefined))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if(!supabaseAdmin) return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
  if(!stripe) return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 });

  type BillingInterval = 'day' | 'week' | 'month' | 'year';
  interface PutBody { plan_id?: string; new_price_cents?: number; interval?: BillingInterval; features?: string[]; name?: string }
  let body: PutBody;
  try { body = await request.json() as PutBody; } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const { plan_id, new_price_cents, interval, features, name } = body;
  if (!plan_id || !new_price_cents || !interval) {
    return NextResponse.json({ error: 'Campos obrigatórios: plan_id, new_price_cents, interval' }, { status: 400 });
  }

  // Carregar plano base
  const { data: plan, error: planErr } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .eq('id', plan_id)
    .single();
  if (planErr || !plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

  // Recuperar versão atual para desativar price antigo no Stripe
  const { data: currentVersion } = await supabaseAdmin
    .from('subscription_plan_prices')
    .select('*')
    .eq('plan_id', plan_id)
    .eq('is_current', true)
    .maybeSingle();

  // Criar novo price no Stripe
  const amount = Number(new_price_cents);
  try {
    // desativar price anterior no Stripe (se existir)
    if (currentVersion?.stripe_price_id) {
      try { await stripe.prices.update(currentVersion.stripe_price_id, { active: false }); } catch (e) { console.warn('Falha ao desativar price antigo', e); }
    }

    const newPrice = await stripe.prices.create({
      unit_amount: amount,
      currency: plan.currency || 'brl',
      recurring: { interval },
      product: plan.stripe_product_id,
      metadata: { plan_id }
    });

    // Iniciar transação simulada (Supabase PostgREST não suporta multi statements direto).
    // Estratégia: marcar antigas versões como is_current=false, inserir nova, atualizar plano.

    const { data: newVersion, error: insertErr } = await supabaseAdmin
      .from('subscription_plan_prices')
      .insert({
        plan_id,
        stripe_price_id: newPrice.id,
        amount_cents: amount,
        currency: plan.currency || 'brl',
        billing_interval: interval,
        is_current: true
      })
      .select()
      .single();
    if (insertErr) return NextResponse.json({ error: 'Falha ao inserir nova versão de preço' }, { status: 500 });
    // Atualizar apenas campos de descrição / features do plano base
    if (features || name) {
      const { error: updErr } = await supabaseAdmin
        .from('subscription_plans')
        .update({
          features: features || plan.features,
          name: name || plan.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', plan_id);
      if (updErr) return NextResponse.json({ error: 'Falha ao atualizar plano base' }, { status: 500 });
    }

    return NextResponse.json({ success: true, new_price_id: newPrice.id, version_id: newVersion.id });
  } catch (err) {
    console.error('[Admin Plans PUT] erro', err);
    const message = (err as Error).message || 'Erro ao criar novo preço';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
