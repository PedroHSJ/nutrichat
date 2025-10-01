'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

interface SubscriptionData {
  success: boolean;
  planName?: string;
  dailyLimit?: number;
  nextBilling?: string;
  subscription?: {
    planName: string;
    status: string;
    currentPeriodEnd: string;
  };
  message?: string;
}


function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setError('Sessão de pagamento não encontrada');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const response = await fetch('/api/subscription/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar pagamento');
      }

      const data = await response.json();
      setSubscriptionData(data);
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      setError('Erro ao verificar pagamento. Entre em contato conosco.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-lg">Verificando seu pagamento...</p>
            <p className="text-sm text-muted-foreground">
              Aguarde enquanto confirmamos sua assinatura
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center border-red-200">
            <CardHeader>
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-600">Erro na Verificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <div className="flex gap-4 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/plans')}
                >
                  Voltar aos Planos
                </Button>
                <Button onClick={() => router.push('/contact')}>
                  Entrar em Contato
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-2xl mx-auto">
        {/* Sucesso Principal */}
        <Card className="text-center border-green-200 mb-8">
          <CardHeader>
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">
              🎉 Assinatura Ativada com Sucesso!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-lg mb-2">
                Bem-vindo ao <strong>NutriChat {subscriptionData?.planName}</strong>!
              </p>
              <p className="text-muted-foreground">
                Sua assinatura está ativa e você já pode aproveitar todos os recursos.
              </p>
            </div>

            {/* Detalhes do Plano */}
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <h3 className="font-semibold mb-3">Detalhes da sua assinatura:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>Plano:</span>
                  <span className="font-medium">{subscriptionData?.planName}</span>
                </li>
                <li className="flex justify-between">
                  <span>Interações diárias:</span>
                  <span className="font-medium">{subscriptionData?.dailyLimit || 'Ilimitado'}</span>
                </li>
                <li className="flex justify-between">
                  <span>Próxima cobrança:</span>
                  <span className="font-medium">
                    {subscriptionData?.nextBilling ? 
                      new Date(subscriptionData.nextBilling).toLocaleDateString('pt-BR') : 
                      'Em processamento'
                    }
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium text-green-600">Ativo</span>
                </li>
              </ul>
            </div>

            {/* Próximos Passos */}
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <h3 className="font-semibold mb-3 text-blue-800">
                🚀 Próximos Passos
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Comece a fazer suas consultas nutricionais
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Explore os recursos do seu plano
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Gerencie sua assinatura a qualquer momento
                </li>
              </ul>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => router.push('/')}
                className="flex-1"
                size="lg"
              >
                Começar a Usar
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/account/subscription')}
                className="flex-1"
                size="lg"
              >
                Gerenciar Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📧 Confirmação por Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enviamos um email de confirmação com todos os detalhes da sua assinatura. 
              Se não receber em alguns minutos, verifique sua caixa de spam ou entre em contato conosco.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-12">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-lg">Verificando seu pagamento...</p>
            <p className="text-sm text-muted-foreground">
              Aguarde enquanto confirmamos sua assinatura
            </p>
          </div>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}