import { cache } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sparkles,
  Crown,
  ArrowRight,
  CheckCircle,
  Activity,
  Users,
  Zap,
  MessageCircle,
  Shield,
  Clock,
} from "lucide-react";
import { PlanOption } from "./(privates)/plans-manage/page";

async function getPlans() {
  // Cache por 24 horas
  // Monta URL absoluta para SSR
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/subscription/plans`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.plans || [];
}

export default async function LandingPage() {
  const plans = await getPlans();

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-24 pt-20">
          <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="flex flex-col gap-6">
              <Badge className="w-fit border-emerald-400 bg-emerald-500/10 text-emerald-300">
                IA especializada para nutricionistas
              </Badge>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                Uma central inteligente para transformar o cuidado nutricional.
              </h1>
              <p className="text-base text-slate-300 sm:text-lg">
                O NutriChat combina fluxos guiados, automacoes e seguranca para
                que cada consulta entregue acompanhamento com a mesma qualidade
                do painel do agente.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  asChild
                  className="flex items-center justify-center gap-2 bg-emerald-500/90 text-slate-900 shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-400 hover:text-slate-900"
                  size="lg"
                >
                  <Link href="/register">
                    Comecar agora
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-slate-700 bg-slate-900/50 text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-200"
                >
                  <Link href="/plans">
                    Ver planos
                    <Crown className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-sm shadow-emerald-500/10">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Tempo
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Ate 5x mais rapido
                  </p>
                  <p className="text-xs text-slate-400">
                    para montar protocolos e cardapios.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-sm shadow-emerald-500/10">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Precisao
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Protocolos assistidos
                  </p>
                  <p className="text-xs text-slate-400">
                    combinando IA e conhecimento clinico.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-sm shadow-emerald-500/10">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Seguranca
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    LGPD e criptografia
                  </p>
                  <p className="text-xs text-slate-400">
                    para proteger dados sensiveis.
                  </p>
                </div>
              </div>
            </div>

            <Card className="border border-slate-800/80 bg-slate-900/70 shadow-lg shadow-emerald-500/10 backdrop-blur">
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2 text-xl text-white">
                  <Sparkles className="h-5 w-5 text-emerald-300" />
                  Experiencia digna do agent-chat
                </CardTitle>
                <CardDescription className="text-sm text-slate-300">
                  O mesmo visual do painel do agente aplicado ao onboarding, com
                  cards translucidos e tipografia consistente para orientar sua
                  equipe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="flex items-start gap-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-3">
                  <MessageCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <div>
                    <p className="font-medium text-slate-200">Fluxos guiados</p>
                    <p>
                      Scripts adaptativos verificam rotina, historico e
                      objetivos em minutos.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-3">
                  <Shield className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <div>
                    <p className="font-medium text-slate-200">
                      Controle de dados
                    </p>
                    <p>
                      Registre consentimento, exporte informacoes e mantenha
                      auditoria de acessos.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-3">
                  <Clock className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <div>
                    <p className="font-medium text-slate-200">
                      Entrega imediata
                    </p>
                    <p>
                      Templates prontos encurtam o tempo entre primeira consulta
                      e plano alimentar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-10">
            <div className="text-center">
              <Badge className="border-emerald-400 bg-emerald-500/10 text-emerald-300">
                O que voce leva
              </Badge>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Ferramentas prontas para elevar a pratica nutricional
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                Um ecossistema integrado para consultas, planos e
                acompanhamento, sem abrir mao da confidencialidade dos dados.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border border-slate-800/70 bg-slate-900/70 shadow-lg shadow-emerald-500/10">
                <CardHeader className="space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Activity className="h-6 w-6 text-emerald-300" />
                  </div>
                  <CardTitle className="text-xl text-white">
                    Protocolos dinamicos
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">
                  Estruture anamnese e follow-up com checklists automatizados e
                  recomendacoes adaptadas ao perfil do paciente.
                </CardContent>
              </Card>

              <Card className="border border-slate-800/70 bg-slate-900/70 shadow-lg shadow-emerald-500/10">
                <CardHeader className="space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Users className="h-6 w-6 text-emerald-300" />
                  </div>
                  <CardTitle className="text-xl text-white">
                    Visao 360 da jornada
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">
                  Integre historico alimentar, evolucao de consultas e tarefas
                  pendentes em um painel unico inspirado no agent-chat.
                </CardContent>
              </Card>

              <Card className="border border-slate-800/70 bg-slate-900/70 shadow-lg shadow-emerald-500/10">
                <CardHeader className="space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Zap className="h-6 w-6 text-emerald-300" />
                  </div>
                  <CardTitle className="text-xl text-white">
                    Automacao segura
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">
                  Centralize templates, exportacoes LGPD e integracoes com
                  suplementos ou exames, tudo protegido com autenticacao
                  Supabase.
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Card className="border border-slate-800/70 bg-slate-900/70 shadow-lg shadow-emerald-500/10">
              <CardHeader>
                <CardTitle className="text-2xl text-white">
                  Resultados em numeros
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Equipes que migraram para o NutriChat com a nova interface
                  relataram:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-300" />
                  <span>
                    80% de reducao em tarefas repetitivas na elaboracao de
                    planos.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-300" />
                  <span>
                    35% mais pacientes ativos com engajamento continuo.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-300" />
                  <span>
                    Tempo medio de onboarding reduzido para 12 minutos.
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                Planos flexiveis para cada fase da sua clinica
              </h2>
              <p className="text-sm text-slate-300 sm:text-base">
                Startups de consultorio ou grandes redes: escolha um plano,
                migre quando quiser e mantenha sempre a mesma identidade
                refinada do agent-chat.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {plans.length === 0 && (
                  <div className="text-slate-300">
                    Nenhum plano disponível no momento.
                  </div>
                )}
                {plans.map((plan: PlanOption) => (
                  <Card
                    key={plan.priceId}
                    className="border border-emerald-400/40 bg-emerald-500/5 shadow-emerald-500/20"
                  >
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-lg text-white">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="text-slate-200">
                        {plan.type === "starter"
                          ? "Profissionais independentes"
                          : plan.type === "pro"
                          ? "Equipes em crescimento"
                          : plan.type}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-200">
                      <p className="text-xl font-semibold text-emerald-300">
                        {plan.priceFormatted}
                      </p>
                      <p>
                        {plan.dailyLimit
                          ? `Até ${plan.dailyLimit} consultas diárias.`
                          : null}
                      </p>
                      {plan.features && plan.features.length > 0 && (
                        <ul className="mt-2 list-disc pl-4 text-emerald-200">
                          {plan.features.map((f: string, idx: number) => (
                            <li key={idx}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                asChild
                variant="outline"
                className="w-fit border-emerald-400/50 bg-slate-900/60 text-emerald-200 transition hover:bg-slate-900/80"
              >
                <Link href="/plans">Consultar todos os planos</Link>
              </Button>
            </div>
          </section>

          <section>
            <Card className="overflow-hidden border border-emerald-400/40 bg-gradient-to-r from-emerald-500/10 via-slate-900/80 to-slate-900/90 shadow-xl shadow-emerald-500/20">
              <CardContent className="flex flex-col gap-6 px-6 py-10 text-center sm:px-10">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/10">
                  <Sparkles className="h-6 w-6 text-emerald-300" />
                </div>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                  Comece a usar o NutriChat hoje mesmo
                </h2>
                <p className="mx-auto max-w-2xl text-sm text-slate-200 sm:text-base">
                  Em poucos minutos voce cria sua conta, conecta com o Supabase
                  Auth e acessa o mesmo ambiente do agent-chat para atender seus
                  pacientes com consistencia visual.
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="flex items-center justify-center gap-2 bg-emerald-500/90 text-slate-900 shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-400 hover:text-slate-900"
                  >
                    <Link href="/register">
                      Criar conta gratuita
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-slate-700 bg-slate-900/50 text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-200"
                  >
                    <Link href="/login">
                      Ja tenho conta
                      <Clock className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}
