"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const Loading = () => (
  <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-slate-100">
    <Card className="w-full max-w-md border border-emerald-400/40 bg-emerald-900/60 shadow-lg shadow-emerald-500/10 backdrop-blur">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-300 mb-4" />
          <h3 className="text-lg font-semibold text-emerald-200 mb-2">
            Verificando pagamento...
          </h3>
          <p className="text-sm text-slate-300">
            Aguarde enquanto confirmamos sua assinatura.
          </p>
        </div>
      </CardContent>
    </Card>
  </main>
);

interface SubscriptionDetails {
  planName: string;
  dailyLimit: number;
  nextBilling?: string;
}

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    "success" | "error" | "processing"
  >("processing");
  const [subscriptionDetails, setSubscriptionDetails] =
    useState<SubscriptionDetails | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setPaymentStatus("error");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const response = await fetch("/api/subscription/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentStatus("success");
        setSubscriptionDetails(data.subscription);
      } else {
        setPaymentStatus("error");
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
      setPaymentStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  // Visual de erro: fundo escuro, card translúcido, cores consistentes
  if (paymentStatus === "error") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-slate-100">
        <Card className="w-full max-w-md border border-red-400/40 bg-red-900/60 shadow-lg shadow-red-500/10 backdrop-blur">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-300">
              Problema na verificação
            </CardTitle>
            <CardDescription className="text-slate-200">
              Não foi possível verificar o status do seu pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-center text-slate-300">
                Por favor, verifique sua conta ou entre em contato conosco se o
                problema persistir.
              </p>
              <div className="flex gap-2">
                <Button
                  asChild
                  className="flex-1 border-emerald-400 bg-emerald-500/10 text-emerald-300"
                >
                  <Link href="/plans">Ver Planos</Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="flex-1 border-slate-700 bg-slate-900/50 text-slate-200"
                >
                  <Link href="/">Início</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Visual de sucesso: fundo escuro, card translúcido, badge, cores e tipografia do site
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-slate-100">
      <Card className="w-full max-w-md border border-emerald-400/40 bg-emerald-900/60 shadow-lg shadow-emerald-500/10 backdrop-blur">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <span className="inline-block rounded-full border border-emerald-400 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Assinatura ativada
            </span>
          </div>
          <CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-2" />
          <CardTitle className="text-2xl text-emerald-200">
            Assinatura ativada!
          </CardTitle>
          <CardDescription className="text-slate-200">
            Seu pagamento foi processado com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscriptionDetails && (
              <div className="bg-emerald-950/40 p-4 rounded-lg border border-emerald-400/30">
                <h4 className="font-semibold text-emerald-200 mb-2">
                  Detalhes da Assinatura
                </h4>
                <div className="space-y-1 text-sm text-emerald-200">
                  <p>
                    <strong>Plano:</strong> {subscriptionDetails.planName}
                  </p>
                  <p>
                    <strong>Limite diário:</strong>{" "}
                    {subscriptionDetails.dailyLimit} interações
                  </p>
                  <p>
                    <strong>Próxima cobrança:</strong>{" "}
                    {subscriptionDetails.nextBilling
                      ? new Date(
                          subscriptionDetails.nextBilling
                        ).toLocaleDateString()
                      : "Não disponível"}
                  </p>
                </div>
              </div>
            )}
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-300">
                Agora você pode aproveitar todos os recursos premium do
                NutriChat!
              </p>
              <div className="space-y-2">
                <Button
                  asChild
                  className="w-full bg-emerald-500/90 text-slate-900 shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-400 hover:text-slate-900"
                >
                  <Link href="/agent-chat">Começar a usar</Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="w-full border-emerald-400/50 bg-slate-900/60 text-emerald-200 transition hover:bg-slate-900/80"
                >
                  <Link href="/plans-manage">Gerenciar Assinatura</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
