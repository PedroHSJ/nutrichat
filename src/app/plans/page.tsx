'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, Crown, Zap, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/context/ChatContext';
import { useSubscription } from '@/hooks/use-subscription';
import { NoPlanWarning } from '@/components/NoPlanWarning';
import { RouteGuard } from '@/components/RouteGuard';
import { supabase } from '@/lib/supabase';

interface Plan {
  type: string;
  name: string;
  dailyLimit: number;
  priceId: string;
  productId: string;
  priceCents: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useChat();
  const { subscriptionStatus, hasActivePlan, refreshSubscription } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    // Se o usuário já tem um plano ativo e está na página de planos, 
    // perguntar se quer ir para o chat
    if (hasActivePlan) {
      const shouldRedirect = confirm(
        'Você já possui um plano ativo. Deseja ir para o chat ou permanecer aqui para gerenciar sua assinatura?'
      );
      if (shouldRedirect) {
        router.push('/chat');
      }
    }
  }, [hasActivePlan, router]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription/plans');
      if (!response.ok) throw new Error('Erro ao carregar planos');
      
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      setError('Erro ao carregar planos. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (priceId: string) => {
    if (!user) {
      setError('Você precisa estar logado para selecionar um plano');
      return;
    }

    if (!supabase) {
      setError('Sistema de autenticação não configurado');
      return;
    }

    setCheckoutLoading(priceId);

    try {
      // Obter o token de acesso atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado');
      }

      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar checkout');
      }

      const data = await response.json();
      
      if (data.checkoutUrl) {
        // Redirecionar para o checkout do Stripe
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('URL de checkout não recebida');
      }

    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
      setError('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (cents: number) => {
    if (isNaN(cents) || cents === null || cents === undefined) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getPlanIcon = (planType: string) => {
    return planType === 'pro' ? (
      <Crown className="h-6 w-6 text-yellow-600" />
    ) : (
      <Zap className="h-6 w-6 text-blue-600" />
    );
  };

  const getPlanFeatures = (planType: string) => {
    if (planType === 'pro') {
      return [
        '150 interações por dia',
        'Respostas mais detalhadas',
        'Acesso prioritário',
        'Suporte por email',
        'Histórico estendido',
        'Recursos avançados'
      ];
    }
    
    return [
      '50 interações por dia',
      'Respostas especializadas',
      'Histórico básico',
      'Suporte da comunidade'
    ];
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex flex-col justify-center items-center min-h-[400px]">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard requiresPlan={false} redirectToLogin={true}>
      <div className="container mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha seu Plano</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Potencialize suas consultas nutricionais com IA especializada. 
            Escolha o plano ideal para suas necessidades profissionais.
          </p>
        </div>

        {/* Aviso para usuários sem plano ativo */}
        {!hasActivePlan && (
          <div className="max-w-2xl mx-auto mb-8">
            <NoPlanWarning />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.type}
            className={`relative ${
              plan.type === 'pro' 
                ? 'border-yellow-500 shadow-lg ring-2 ring-yellow-500/20' 
                : 'border-border'
            }`}
          >
            {plan.type === 'pro' && (
              <Badge 
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white"
              >
                Mais Popular
              </Badge>
            )}
            
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                {getPlanIcon(plan.type)}
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription className="text-base">
                {plan.type === 'pro' 
                  ? 'Para nutricionistas que precisam de mais interações e recursos avançados'
                  : 'Perfeito para começar com IA nutricional especializada'
                }
              </CardDescription>
              <div className="pt-4">
                <div className="text-4xl font-bold">
                  {formatPrice(plan.priceCents)}
                </div>
                <div className="text-sm text-muted-foreground">por mês</div>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3 mb-6">
                {getPlanFeatures(plan.type).map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => handleSelectPlan(plan.priceId)}
                disabled={checkoutLoading === plan.priceId}
                className={`w-full ${
                  plan.type === 'pro' 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : ''
                }`}
                size="lg"
              >
                {checkoutLoading === plan.priceId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Assinar Agora'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Cancele a qualquer momento. Sem compromisso.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">
            🔒 Pagamento 100% Seguro
          </h3>
          <p className="text-sm text-muted-foreground">
            Processamento seguro via Stripe. Seus dados de pagamento são criptografados 
            e protegidos pelos mais altos padrões de segurança da indústria.
          </p>
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}