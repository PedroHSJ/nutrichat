"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
interface PlanOption {
  type: string;
  name: string;
  dailyLimit: number;
  priceId: string;
  productId: string;
  priceCents: number;
  currency: string;
  priceFormatted: string;
  features: string[];
}

async function getPlans(): Promise<PlanOption[]> {
  try {
    const response = await apiClient.getPlans();
    const data = response.data;
    const sortedPlans = (a: PlanOption, b: PlanOption) => {
      if (a.priceCents < b.priceCents) return -1;
      if (a.priceCents > b.priceCents) return 1;
      return 0;
    };

    return data.plans.sort(sortedPlans);
  } catch {
    return [];
  }
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const { logout, authLoading, isAuthenticated, session, user } = useAuth();
  const displayName =
    (user?.user_metadata as { name?: string } | undefined)?.name ??
    (session?.user.user_metadata as { name?: string } | undefined)?.name ??
    user?.email ??
    session?.user.email ??
    "";
  const router = useRouter();
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setPlans(await getPlans());
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 flex flex-col gap-12 items-center">
        {authLoading && (
          <div className="text-slate-300">Verificando sua sessão...</div>
        )}
        <h1 className="text-4xl font-semibold text-white mb-2">
          Escolha seu plano
        </h1>
        {session ? (
          <p className="text-sm text-emerald-300">Oi, {displayName}!</p>
        ) : (
          <p className="text-sm text-amber-300">Nenhuma sessão ativa.</p>
        )}
        <p className="mb-8 text-base text-slate-300 text-center max-w-2xl">
          Compare as opções e selecione o plano ideal para sua jornada no
          NutriChat.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 w-full">
          {loading ? (
            <div className="text-slate-400">Carregando planos...</div>
          ) : plans.length === 0 ? (
            <div className="text-slate-400">
              Nenhum plano disponível no momento.
            </div>
          ) : (
            plans.map((plan) => (
              <Card
                key={plan.priceId}
                className="border border-emerald-400/40 bg-emerald-500/5 shadow-emerald-500/20 backdrop-blur flex flex-col h-full"
              >
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg text-white">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-slate-200">
                    {plan.dailyLimit > 0
                      ? `${plan.dailyLimit} interações/dia`
                      : "Interações ilimitadas"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 space-y-2 text-sm text-emerald-200">
                  <p className="text-xl font-semibold text-emerald-300">
                    {plan.priceFormatted}
                  </p>
                  {plan.features && plan.features.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-emerald-200">
                      {plan.features.map((f, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex-1" />
                  <Button
                    className="w-full bg-emerald-500/90 text-slate-900 shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-400 hover:text-slate-900"
                    variant="default"
                    onClick={async () => {
                      setCheckoutPlanId(plan.priceId);
                      try {
                        const response = await apiClient.createCheckoutSession({
                          priceId: plan.priceId,
                        });
                        const data = response.data;

                        if (response.status === 409) {
                          alert(
                            "⚠️ Você já possui uma assinatura ativa.\n\n" +
                              "Para alterar seu plano, primeiro cancele sua assinatura atual na área de gerenciamento de assinaturas.",
                          );
                          return;
                        }

                        if (!data.checkoutUrl) {
                          alert(
                            data?.error ||
                              "Não foi possível iniciar o checkout.",
                          );
                          return;
                        }
                        window.location.href = data.checkoutUrl;
                      } catch (err) {
                        console.error("Erro ao iniciar checkout:", err);
                        alert("Erro ao iniciar checkout. Tente novamente.");
                      } finally {
                        setCheckoutPlanId(null);
                      }
                    }}
                    disabled={
                      !plan.priceId ||
                      !session ||
                      checkoutPlanId === plan.priceId
                    }
                  >
                    {checkoutPlanId === plan.priceId
                      ? "Iniciando..."
                      : "Selecionar plano"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <Button
          variant="outline"
          className="mt-8 border-emerald-400/50 bg-slate-900/60 text-emerald-200 transition hover:bg-slate-900/80"
          onClick={async () => {
            await logout();
          }}
        >
          Sair
        </Button>
      </div>
    </main>
  );
}
