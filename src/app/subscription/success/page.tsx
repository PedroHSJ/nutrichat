'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Verificando pagamento...
          </h3>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto confirmamos sua assinatura.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

interface SubscriptionDetails {
  planName: string;
  dailyLimit: number;
  nextBilling?: string;
}


function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'error' | 'processing'>('processing');
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setPaymentStatus('error');
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
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentStatus('success');
        setSubscriptionDetails(data.subscription);
      } else {
        setPaymentStatus('error');
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      setPaymentStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (paymentStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-600">
              Problema na Verificação
            </CardTitle>
            <CardDescription>
              Não foi possível verificar o status do seu pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Por favor, verifique sua conta ou entre em contato conosco se o problema persistir.
              </p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href="/plans">Ver Planos</Link>
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/">Início</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-2xl text-green-600">
            Assinatura Ativada! 🎉
          </CardTitle>
          <CardDescription>
            Seu pagamento foi processado com sucesso
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {subscriptionDetails && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">
                  Detalhes da Assinatura
                </h4>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Plano:</strong> {subscriptionDetails.planName}</p>
                  <p><strong>Limite diário:</strong> {subscriptionDetails.dailyLimit} interações</p>
                  <p><strong>Próxima cobrança:</strong> {
                    subscriptionDetails.nextBilling 
                      ? new Date(subscriptionDetails.nextBilling).toLocaleDateString()
                      : 'Não disponível'
                  }</p>
                </div>
              </div>
            )}
            
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Agora você pode aproveitar todos os recursos premium do NutriChat!
              </p>
              
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/">Começar a Usar</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/subscription/manage">Gerenciar Assinatura</Link>
                </Button>
              </div>
            </div>

            {/* <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 text-center">
                📧 Um email de confirmação foi enviado para você com todos os detalhes da assinatura.
              </p>
            </div> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<Loading />}> 
      <SubscriptionSuccessContent />
    </Suspense>
  );
}