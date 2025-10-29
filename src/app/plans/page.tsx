"use client";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

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
    const res = await fetch("/api/subscription/plans");
    if (!res.ok) return [];
    const data = await res.json();
    return data.plans || [];
  } catch {
    return [];
  }
}

import { useEffect, useState } from "react";

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const authHeaders = useAuthHeaders();

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
        <h1 className="text-4xl font-semibold text-white mb-2">
          Escolha seu plano
        </h1>
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
                      try {
                        const res = await fetch("/api/subscription/checkout", {
                          method: "POST",
                          headers: {
                            ...authHeaders,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ priceId: plan.priceId }),
                        });
                        const data = await res.json();
                        if (!res.ok || !data.checkoutUrl) {
                          alert(
                            data?.error || "Não foi possível iniciar o checkout."
                          );
                          return;
                        }
                        window.location.href = data.checkoutUrl;
                      } catch (err) {
                        alert("Erro ao iniciar checkout. Tente novamente.");
                      }
                    }}
                    disabled={!plan.priceId}
                  >
                    Selecionar plano
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <Button
          asChild
          variant="outline"
          className="mt-8 border-emerald-400/50 bg-slate-900/60 text-emerald-200 transition hover:bg-slate-900/80"
        >
          <Link href="/">Voltar para início</Link>
        </Button>
      </div>
    </main>
  );
}
