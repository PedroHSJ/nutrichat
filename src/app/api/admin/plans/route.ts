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
    .order('price_cents', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Buscar preços versionados
  const { data: prices, error: priceErr } = await supabaseAdmin
    .from('subscription_plan_prices')
    .select('*')
    .order('created_at', { ascending: false });
  if (priceErr) return NextResponse.json({ error: priceErr.message }, { status: 500 });

  const byPlan = (plans||[]).map(p => ({
    ...p,
    price_versions: (prices||[]).filter(pr => pr.plan_id === p.id)
  }));

  return NextResponse.json({ plans: byPlan });
}

// PUT: atualiza plano criando novo price na Stripe e marcando antigo como não-current
// Body: { plan_id, new_price_cents, interval, features?, name? }
export async function PUT(request: Request) {
  if (!(await isAdminSession(undefined))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if(!supabaseAdmin) return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
  if(!stripe) return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const { plan_id, new_price_cents, interval, features, name } = body;
  if (!plan_id || !new_price_cents || !interval) {
    return NextResponse.json({ error: 'Campos obrigatórios: plan_id, new_price_cents, interval' }, { status: 400 });
  }

  // Carregar plano atual
  const { data: plan, error: planErr } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .eq('id', plan_id)
    .single();
  if (planErr || !plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

  // Criar novo price no Stripe
  const amount = Number(new_price_cents);
  try {
    // desativar price anterior no Stripe (se existir)
    if (plan.stripe_price_id) {
      try { await stripe.prices.update(plan.stripe_price_id, { active: false }); } catch (e) { console.warn('Falha ao desativar price antigo', e); }
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

    const { error: unsetErr } = await supabaseAdmin
      .from('subscription_plan_prices')
      .update({ is_current: false })
      .eq('plan_id', plan_id)
      .eq('is_current', true);
    if (unsetErr) return NextResponse.json({ error: 'Falha ao limpar versões atuais' }, { status: 500 });

    const { error: insertErr } = await supabaseAdmin
      .from('subscription_plan_prices')
      .insert({
        plan_id,
        stripe_price_id: newPrice.id,
        price_cents: amount,
        interval,
        is_current: true
      });
    if (insertErr) return NextResponse.json({ error: 'Falha ao inserir nova versão de preço' }, { status: 500 });

    const { error: updErr } = await supabaseAdmin
      .from('subscription_plans')
      .update({
        stripe_price_id: newPrice.id,
        price_cents: amount,
        interval,
        features: features || plan.features,
        name: name || plan.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan_id);
    if (updErr) return NextResponse.json({ error: 'Falha ao atualizar plano base' }, { status: 500 });

    return NextResponse.json({ success: true, new_price_id: newPrice.id });
  } catch (err:any) {
    console.error('[Admin Plans PUT] erro', err);
    return NextResponse.json({ error: 'Erro ao criar novo preço' }, { status: 500 });
  }
}
