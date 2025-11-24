"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Bot,
  Carrot,
  Check,
  Cpu,
  Database,
  FileSpreadsheet,
  Library,
  Link as LinkIcon,
  Lock,
  Menu,
  MessageSquareMore,
  Microscope,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  X,
  Leaf,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  leaf: Leaf,
  menu: Menu,
  x: X,
  lock: Lock,
  database: Database,
  "arrow-right": ArrowRight,
  "play-circle": PlayCircle,
  link: LinkIcon,
  "book-open": BookOpen,
  "file-spreadsheet": FileSpreadsheet,
  carrot: Carrot,
  microscope: Microscope,
  "message-square-more": MessageSquareMore,
  "shield-check": ShieldCheck,
  search: Search,
  bot: Bot,
  plus: Plus,
  library: Library,
  cpu: Cpu,
  "arrow-down": ArrowDown,
  check: Check,
};

type IconName = keyof typeof iconMap;

const Icon = ({
  name,
  size = 24,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) => {
  const Component = iconMap[name];
  if (!Component) return null;
  return <Component size={size} className={className} />;
};

const Reveal = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("active");
          observer.unobserve(node);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

const BackgroundEffects = () => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <div className="absolute inset-0 bg-slate-900" />
    <div className="absolute inset-0 tech-grid opacity-20" />

    <div className="absolute top-0 -left-4 h-96 w-96 animate-blob rounded-full bg-blue-600/20 blur-3xl mix-blend-screen opacity-70" />
    <div
      className="absolute top-0 -right-4 h-96 w-96 animate-blob rounded-full bg-purple-600/20 blur-3xl mix-blend-screen opacity-70"
      style={{ animationDelay: "2s" }}
    />
    <div
      className="absolute -bottom-32 left-20 h-96 w-96 animate-blob rounded-full bg-emerald-600/20 blur-3xl mix-blend-screen opacity-70"
      style={{ animationDelay: "4s" }}
    />
  </div>
);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-800 bg-slate-900/90 py-2 backdrop-blur-md"
          : "bg-transparent py-4"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="group flex cursor-pointer items-center gap-2">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 transition-all group-hover:scale-105 group-hover:bg-emerald-500/20">
            <Icon name="leaf" className="text-emerald-400" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            NutriChat
          </span>
        </div>

        <div className="hidden items-center space-x-8 md:flex">
          {["Funcionalidades", "Nossa Base Científica", "Planos"].map(
            (item, idx) => (
              <a
                key={idx}
                href={`#${item.split(" ")[0].toLowerCase()}`}
                className="inline-block text-sm font-medium text-slate-300 transition hover:-translate-y-0.5 hover:text-emerald-400"
              >
                {item}
              </a>
            )
          )}
          <Link
            href="/login"
            className="rounded-full border border-emerald-500/50 bg-emerald-600 px-5 py-2 font-medium text-white shadow-lg shadow-emerald-900/20 transition hover:scale-105 hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-95"
          >
            Começar Agora
          </Link>
        </div>

        <div className="md:hidden">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-slate-300 transition hover:text-white"
            aria-label="Alternar menu"
          >
            <Icon name={isOpen ? "x" : "menu"} />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="animate-fade-in-down border-b border-slate-800 bg-slate-900 p-4 md:hidden">
          <div className="flex flex-col space-y-4">
            <a
              href="#funcionalidades"
              className="text-slate-300 hover:text-white"
            >
              Funcionalidades
            </a>
            <a href="#tecnologia" className="text-slate-300 hover:text-white">
              Tecnologia
            </a>
            <a href="#planos" className="text-slate-300 hover:text-white">
              Planos
            </a>
            <Link
              href="/login"
              className="w-full rounded-lg bg-emerald-600 px-5 py-2 text-center text-white"
            >
              Começar Agora
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  );
};

const ChatSimulation = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const runSequence = () => {
      setStep(0);
      setTimeout(() => setStep(1), 1000);
      setTimeout(() => setStep(2), 2500);
      setTimeout(() => setStep(3), 5500);
    };

    runSequence();
    const interval = setInterval(runSequence, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="group relative animate-float-delayed">
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-500 blur opacity-20 transition duration-1000 group-hover:opacity-40" />
      <div className="relative flex h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/50 p-4">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <div className="ml-4 flex items-center gap-2 font-mono text-xs text-slate-500">
            <Icon name="lock" size={10} /> nutrichat_v2.1
          </div>
        </div>

        <div className="relative flex-1 space-y-6 overflow-hidden bg-slate-900/50 p-6 text-sm">
          <div
            className={`flex justify-end transform transition-all duration-500 ${
              step >= 1
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 p-4 text-white shadow-lg shadow-blue-900/20">
              <p>
                O paciente tem ferritina baixa e é vegano. Quais estratégias
                baseadas em evidência?
              </p>
            </div>
          </div>

          <div
            className={`transition-all duration-300 ${
              step === 2
                ? "h-auto scale-100 opacity-100"
                : "h-0 scale-95 overflow-hidden opacity-0"
            }`}
          >
            <div className="flex w-fit items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-900/20 p-2 text-xs font-medium text-emerald-400">
              <Icon name="database" size={14} className="animate-spin-slow" />
              <span>Lendo TACO, BRASPEN, PubMed...</span>
            </div>
          </div>

          <div
            className={`flex justify-start transform transition-all duration-700 ${
              step >= 3
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <div className="max-w-[95%] rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800 p-4 text-slate-200 shadow-md">
              <p className="mb-3">
                Baseado na{" "}
                <strong className="text-white">
                  Diretriz da BRASPEN (2023)
                </strong>{" "}
                e tabela <strong className="text-white">TBCA</strong>:
              </p>
              <ul className="mb-3 list-disc space-y-2 pl-4 text-slate-300">
                <li>Combinar fontes de ferro não-heme com Ácido Ascórbico.</li>
                <li>Evitar polifenóis (chá, café) 1h antes/depois.</li>
                <li>Remolho de leguminosas por 12h.</li>
              </ul>
              <div className="mt-2 flex items-center gap-1 border-t border-slate-700 pt-2 text-xs text-slate-500">
                <Icon name="link" size={10} />
                <span className="font-semibold">Fontes:</span> Am J Clin Nutr.
                2022.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Hero = () => {
  const terms = useMemo(
    () => ["Prescrição", "Dieta", "Conduta", "Análise", "Orientação"],
    []
  );
  const [termIndex, setTermIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setTermIndex((prev) => (prev + 1) % terms.length),
      3000
    );
    return () => clearInterval(interval);
  }, [terms]);

  return (
    <section className="relative z-10 flex min-h-screen items-center overflow-hidden pb-20 pt-32">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-4 py-1.5 backdrop-blur-sm transition hover:border-emerald-500/50">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-emerald-400">
                  Base de dados atualizada 2025
                </span>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
                Segurança científica absoluta para a sua{" "}
                <span
                  key={termIndex}
                  className="gradient-text inline-block animate-text-change"
                >
                  {terms[termIndex]}
                </span>
                .
              </h1>
            </Reveal>

            <Reveal delay={400}>
              <p className="max-w-xl text-lg leading-relaxed text-slate-400">
                Ao contrário de IAs genéricas, o NutriChat consulta uma{" "}
                <strong>Biblioteca Científica Exclusiva</strong> (Tabelas TACO,
                Artigos e Diretrizes) antes de te responder.
              </p>
            </Reveal>

            <Reveal delay={600}>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="group flex items-center justify-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-600 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-1 hover:bg-emerald-500 hover:shadow-emerald-500/30 active:translate-y-0"
                >
                  Testar Gratuitamente
                  <span className="transition-transform group-hover:translate-x-1">
                    <Icon name="arrow-right" size={20} />
                  </span>
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-8 py-4 font-semibold text-slate-300 transition hover:-translate-y-1 hover:bg-slate-800 hover:text-white active:translate-y-0"
                >
                  <Icon name="play-circle" size={20} />
                  Ver Demo
                </Link>
              </div>
            </Reveal>

            <Reveal delay={800}>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="z-0 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-slate-900 bg-slate-800 text-xs transition-transform hover:z-10 hover:scale-110"
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 20}`}
                        alt="avatar"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-slate-400">
                  Usado por <span className="font-bold text-white">+1.200</span>{" "}
                  Nutricionistas
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={400}>
            <ChatSimulation />
          </Reveal>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({
  icon,
  title,
  desc,
  delay,
}: {
  icon: IconName;
  title: string;
  desc: string;
  delay: number;
}) => (
  <Reveal delay={delay}>
    <div className="group h-full rounded-xl border border-slate-700 bg-slate-800/50 p-6 shadow-lg backdrop-blur-sm transition duration-300 hover:-translate-y-2 hover:border-emerald-500/30 hover:shadow-emerald-900/20">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-500/10 bg-emerald-500/10 transition duration-300 group-hover:scale-110 group-hover:bg-emerald-500/20">
        <Icon name={icon} size={24} className="text-emerald-400" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-white transition group-hover:text-emerald-300">
        {title}
      </h3>
      <p className="leading-relaxed text-slate-400">{desc}</p>
    </div>
  </Reveal>
);

const Features = () => {
  const featuresList = [
    {
      icon: "book-open",
      title: "Dados Verificados",
      desc: "Nossa IA não 'chuta'. Ela busca informações em uma base curada de guidelines, tabelas nutricionais e papers.",
    },
    {
      icon: "file-spreadsheet",
      title: "Cálculos Automáticos",
      desc: "Peça para calcular GET, VET ou distribuição de macronutrientes de uma receita instantaneamente.",
    },
    {
      icon: "carrot",
      title: "Sugestões de Cardápio",
      desc: "Gere ideias de substituições e receitas adaptadas a restrições (FODMAPs, Glúten, Alergias) em segundos.",
    },
    {
      icon: "microscope",
      title: "Análise de Exames",
      desc: "Faça upload de resultados e receba correlações nutricionais baseadas em valores de referência.",
    },
    {
      icon: "message-square-more",
      title: "Suporte a Dúvidas",
      desc: "Tire dúvidas rápidas sobre interações droga-nutriente durante a consulta sem abrir 10 abas.",
    },
    {
      icon: "shield-check",
      title: "Privacidade Total",
      desc: "Seus dados e os dados dos seus pacientes são criptografados. Não usamos chats para treinar modelos.",
    },
  ] as const;

  return (
    <section id="funcionalidades" className="relative z-10 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Reveal>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
              Funcionalidades
            </h2>
            <h3 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Mais que um chat, um co-piloto nutricional
            </h3>
            <p className="text-slate-400">
              Automatize a pesquisa técnica e foque no atendimento humanizado ao
              seu paciente.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {featuresList.map((feature, idx) => (
            <FeatureCard key={feature.title} {...feature} delay={idx * 100} />
          ))}
        </div>
      </div>
    </section>
  );
};

const TechExplanation = () => (
  <section
    id="tecnologia"
    className="relative z-10 border-y border-slate-800 bg-slate-900/50 py-20 backdrop-blur-sm"
  >
    <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="space-y-6">
        <Reveal>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
            Nossa Tecnologia
          </h3>
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            O Poder da nossa <br />
            Base Científica
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="text-slate-300">
            IAs comuns respondem com base no que &quot;acham&quot;. O NutriChat funciona
            diferente: ele consulta dados oficiais em tempo real.
          </p>
        </Reveal>
        <ul className="space-y-4">
          {[
            {
              icon: "search",
              color: "emerald",
              title: "1. Busca em Fontes",
              text: "Ao receber sua pergunta, buscamos trechos relevantes em nossa biblioteca de nutrição.",
            },
            {
              icon: "database",
              color: "blue",
              title: "2. Contextualização",
              text: "Os dados oficiais (TACO, Diretrizes) são anexados à sua pergunta.",
            },
            {
              icon: "bot",
              color: "purple",
              title: "3. Resposta Fundamentada",
              text: "A IA gera a resposta usando APENAS a ciência fornecida, citando a fonte.",
            },
          ].map((item, idx) => (
            <Reveal key={item.title} delay={200 + idx * 100}>
              <li className="flex items-start gap-3 rounded-lg p-3 transition duration-300 hover:bg-white/5">
                <div
                  className={`mt-1 rounded border p-2 ${item.color === "emerald" ? "border-emerald-500/20 bg-emerald-500/20 text-emerald-400" : ""} ${item.color === "blue" ? "border-blue-500/20 bg-blue-500/20 text-blue-400" : ""} ${item.color === "purple" ? "border-purple-500/20 bg-purple-500/20 text-purple-400" : ""}`}
                >
                  <Icon name={item.icon as IconName} size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white">{item.title}</h4>
                  <p className="text-sm text-slate-400">{item.text}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>

      <Reveal delay={300}>
        <div className="animate-float rounded-2xl border border-slate-700 bg-slate-800/80 p-2 shadow-2xl backdrop-blur-md">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
            <div className="mb-8 text-center">
              <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 font-mono text-xs text-slate-300">
                Fluxo de Verificação
              </span>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-full transform rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center transition duration-300 hover:scale-105">
                <p className="text-sm font-mono text-emerald-300">
                  Pergunta do Nutricionista
                </p>
              </div>
              <Icon
                name="arrow-down"
                className="animate-bounce text-slate-600"
              />
              <div className="flex w-full gap-4">
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-center transition duration-300 hover:scale-105">
                  <Icon name="library" className="text-blue-400" />
                  <p className="text-xs text-blue-300">Biblioteca Científica</p>
                </div>
                <div className="flex items-center text-slate-600">
                  <Icon name="plus" size={16} />
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4 text-center transition duration-300 hover:scale-105">
                  <Icon name="cpu" className="text-purple-400" />
                  <p className="text-xs text-purple-300">
                    Inteligência Artificial
                  </p>
                </div>
              </div>
              <Icon
                name="arrow-down"
                className="animate-bounce text-slate-600"
              />
              <div className="w-full transform rounded-lg border border-slate-600/30 bg-slate-800 p-4 text-center transition duration-300 hover:scale-105">
                <p className="text-sm font-bold text-white">
                  Resposta com Referências
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

const Pricing = ({
  plans,
  loading,
}: {
  plans: PlanOption[];
  loading: boolean;
}) => {
  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          (a.priceCents ?? Number.MAX_SAFE_INTEGER) -
          (b.priceCents ?? Number.MAX_SAFE_INTEGER)
      ),
    [plans]
  );

  const highlight = sortedPlans.find((p) => p.type === "pro") ?? sortedPlans[1];

  return (
    <section id="planos" className="relative z-10 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <Reveal>
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Planos flexíveis
            </h2>
            <p className="text-slate-400">
              Escolha a melhor opção para sua fase de carreira.
            </p>
          </Reveal>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-8 md:grid-cols-3">
          {loading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <Reveal key={idx} delay={idx * 100}>
                <div className="h-full rounded-2xl border border-slate-700 bg-slate-800/40 p-8 shadow-sm backdrop-blur-sm">
                  <div className="mb-4 h-4 w-24 rounded bg-slate-700" />
                  <div className="mb-4 h-10 w-32 rounded bg-slate-700" />
                  <div className="mb-6 h-4 w-full rounded bg-slate-700" />
                  <div className="mb-8 space-y-3">
                    <div className="h-4 w-3/4 rounded bg-slate-700" />
                    <div className="h-4 w-2/3 rounded bg-slate-700" />
                    <div className="h-4 w-1/2 rounded bg-slate-700" />
                  </div>
                  <div className="h-10 w-full rounded bg-slate-700" />
                </div>
              </Reveal>
            ))}

          {!loading && sortedPlans.length === 0 ? (
            <Reveal>
              <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-300">
                Nenhum plano disponível no momento.
              </div>
            </Reveal>
          ) : null}

          {!loading &&
            sortedPlans.map((plan, idx) => {
              const isHighlight = plan.priceId === highlight?.priceId;
              const featureItems = plan.features ?? [];
              return (
                <Reveal key={plan.priceId} delay={idx * 100}>
                  <div
                    className={`flex h-full flex-col rounded-2xl p-8 transition duration-300 ${
                      isHighlight
                        ? "relative border-2 border-emerald-500 bg-slate-800/80 shadow-2xl shadow-emerald-900/20 backdrop-blur-md md:-translate-y-4 hover:-translate-y-6"
                        : "border border-slate-700 bg-slate-800/40 shadow-sm backdrop-blur-sm hover:-translate-y-2 hover:bg-slate-800/60"
                    }`}
                  >
                    {isHighlight && (
                      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/50 animate-pulse">
                        Mais Popular
                      </div>
                    )}
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      {plan.name}
                    </h3>
                    <div className="mb-4 text-4xl font-bold text-white">
                      {plan.priceFormatted ?? "—"}
                      <span className="text-base font-normal text-slate-400">
                        /mês
                      </span>
                    </div>
                    <p className="mb-6 text-sm text-slate-400">
                      {plan.type === "starter"
                        ? "Para quem está começando."
                        : plan.type === "pro"
                          ? "O kit essencial para o consultório."
                          : plan.type === "team"
                            ? "Para equipes e clínicas."
                            : "Plano personalizado para sua operação."}
                    </p>
                    <ul className="mb-8 flex-1 space-y-3 text-sm text-slate-300">
                      {/*plan.dailyLimit ? (
                        <li className="flex items-center gap-2">
                          <Icon
                            name="check"
                            size={16}
                            className={isHighlight ? "text-emerald-400" : "text-emerald-500"}
                          />
                          Até {plan.dailyLimit} consultas diárias
                        </li>
                      ) : null*/}
                      {featureItems.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Icon
                            name="check"
                            size={16}
                            className={
                              isHighlight
                                ? "text-emerald-400"
                                : "text-emerald-500"
                            }
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/login"
                      className={
                        isHighlight
                          ? "transform rounded-lg bg-emerald-600 py-3 text-center font-medium text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 hover:bg-emerald-500 hover:shadow-emerald-500/50"
                          : "w-full rounded-lg border border-slate-600 py-2 text-center font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                      }
                    >
                      {plan.type === "starter"
                        ? "Criar conta grátis"
                        : plan.type === "pro"
                          ? "Assinar Pro"
                          : "Falar com Vendas"}
                    </Link>
                  </div>
                </Reveal>
              );
            })}
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  const faqs = [
    {
      q: "A IA substitui o Nutricionista?",
      a: "De jeito nenhum. O NutriChat é uma ferramenta de suporte à decisão clínica. Ele faz o trabalho 'pesado' de pesquisa e cálculo, permitindo que você use seu julgamento clínico com mais eficiência.",
    },
    {
      q: "Quais bases de dados vocês utilizam?",
      a: "Utilizamos bases públicas e verificadas como TACO (Unicamp), TBCA (USP), USDA, além de diretrizes da BRASPEN, SBAN e papers indexados no PubMed com alto fator de impacto.",
    },
    {
      q: "Posso confiar nos cálculos?",
      a: "Diferente de IAs que 'adivinham' números, nossa tecnologia de verificação extrai os valores exatos das tabelas nutricionais antes de realizar o cálculo matemático.",
    },
    {
      q: "Tem período de teste?",
      a: "Sim! Você tem 7 dias de garantia no plano Pro, ou pode usar o plano Estudante gratuitamente para sempre com limitações.",
    },
  ];

  return (
    <section className="relative z-10 border-t border-slate-800 bg-slate-900/50 py-20 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="mb-12 text-center text-3xl font-bold text-white">
            Perguntas Frequentes
          </h2>
        </Reveal>
        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <Reveal key={faq.q} delay={idx * 100}>
              <div className="group border-b border-slate-800 pb-6 transition hover:border-slate-700">
                <h3 className="mb-2 text-lg font-semibold text-slate-200 transition group-hover:text-white">
                  {faq.q}
                </h3>
                <p className="text-slate-400 transition group-hover:text-slate-300">
                  {faq.a}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="relative z-10 border-t border-slate-900 bg-slate-950 py-12 text-slate-400">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-2 text-white">
            <Icon name="leaf" className="text-emerald-500" />
            <span className="text-xl font-bold">NutriChat</span>
          </div>
          <p className="text-sm text-slate-500">
            Inteligência artificial com rigor científico para nutricionistas
            modernos.
          </p>
        </div>
        <div>
          <h4 className="mb-4 font-semibold text-white">Produto</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="transition hover:text-emerald-400">
                Funcionalidades
              </a>
            </li>
            <li>
              <a href="#" className="transition hover:text-emerald-400">
                Base de Dados
              </a>
            </li>
            <li>
              <a href="#" className="transition hover:text-emerald-400">
                Preços
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-semibold text-white">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="transition hover:text-emerald-400">
                Termos de Uso
              </a>
            </li>
            <li>
              <a href="#" className="transition hover:text-emerald-400">
                Privacidade
              </a>
            </li>
            <li>
              <a href="#" className="transition hover:text-emerald-400">
                LGPD
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-semibold text-white">Contato</h4>
          <ul className="space-y-2 text-sm">
            <li>contato@nutrichat.com.br</li>
            <li>João Pessoa, PB - Brasil</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-900 pt-8 text-center text-sm text-slate-600">
        &copy; 2025 NutriChat Tecnologia Ltda. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);

export default function LandingPage() {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/subscription/plans");
        if (!res.ok) throw new Error("Falha ao buscar planos");
        const data = await res.json();
        const normalized = (data.plans ?? []).map((plan: PlanOption) => ({
          ...plan,
          features:
            plan.features && plan.features.length > 0
              ? plan.features
              : (plan.items ?? []),
        }));
        if (isMounted) setPlans(normalized);
      } catch (error) {
        console.warn("[Landing] Erro ao buscar planos", error);
        if (isMounted) setPlans([]);
      } finally {
        if (isMounted) setLoadingPlans(false);
      }
    };
    fetchPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-50 selection:bg-emerald-500/30">
      <BackgroundEffects />
      <Navbar />
      <Hero />
      <Features />
      <TechExplanation />
      <Pricing plans={plans} loading={loadingPlans} />
      <FAQ />

      <section className="relative z-10 border-t border-slate-800 py-20">
        <div className="absolute inset-0 bg-emerald-900/20 backdrop-blur-sm" />
        <Reveal>
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
              Pronto para elevar o nível das suas consultas?
            </h2>
            <p className="mb-8 text-lg text-emerald-100/80">
              Junte-se a milhares de nutricionistas que economizam tempo e
              entregam mais valor.
            </p>
            <Link
              href="/login"
              className="transform rounded-lg bg-emerald-500 px-8 py-4 font-bold text-white shadow-xl shadow-emerald-900/50 transition duration-300 hover:scale-105 hover:bg-emerald-400"
            >
              Começar Teste Grátis
            </Link>
            <p className="mt-4 text-sm text-emerald-200/60">
              Sem cartão de crédito para começar.
            </p>
          </div>
        </Reveal>
      </section>

      <Footer />

      <style jsx global>{`
        body {
          background-color: #0f172a;
          color: #f8fafc;
        }
        .gradient-text {
          background: linear-gradient(to right, #34d399, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .tech-grid {
          background-size: 50px 50px;
          background-image:
            linear-gradient(
              to right,
              rgba(255, 255, 255, 0.05) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.05) 1px,
              transparent 1px
            );
          mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
        }
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        @keyframes float-delayed {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 7s ease-in-out infinite 2s;
        }
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-text-change {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.5, 0, 0, 1);
        }
        .reveal.active {
          opacity: 1;
          transform: translateY(0);
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.3s ease-out forwards;
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
type PlanOption = {
  priceId: string;
  name: string;
  priceFormatted?: string;
  priceCents?: number;
  dailyLimit?: number | null;
  features?: string[];
  items?: string[];
  type?: string;
};
