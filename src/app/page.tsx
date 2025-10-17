'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MessageCircle, Clock, Shield, Zap, Users, Crown, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/use-subscription';
import Link from 'next/link';
<script
  src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
  async
></script>
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { hasActivePlan, loading: subscriptionLoading } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    // Se o usuário está autenticado e não tem plano ativo, redirecionar para planos
    if (isAuthenticated && !subscriptionLoading && !hasActivePlan) {
      router.push('/plans');
    }
    // Se o usuário está autenticado e tem plano ativo, redirecionar para chat
    if (isAuthenticated && !subscriptionLoading && hasActivePlan) {
      router.push('/chat');
    }
  }, [isAuthenticated, hasActivePlan, subscriptionLoading, router]);
  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-20 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              ✨ Inteligência Artificial para Nutricionistas
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Revolucione sua
              <span className="text-green-600"> Consultoria Nutricional</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              O NutriChat é o assistente de IA especializado que ajuda nutricionistas a otimizar consultas, 
              criar planos alimentares personalizados e oferecer orientações precisas aos seus pacientes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/chat">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/plans">
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  Ver Planos
                  <Crown className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o NutriChat?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ferramentas poderosas de IA para elevar sua prática profissional a um novo patamar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <MessageCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Consultas Inteligentes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  Obtenha insights instantâneos sobre nutrição, interações medicamentosas e 
                  recomendações personalizadas para cada paciente.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Economize Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  Automatize cálculos nutricionais, crie cardápios rapidamente e 
                  tenha acesso instantâneo a informações científicas atualizadas.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Seguro e Confiável</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  Todas as informações são baseadas em evidências científicas, 
                  com proteção total da privacidade dos seus dados e pacientes.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white/80 backdrop-blur py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-green-600 mb-2">500+</div>
                <div className="text-gray-600">Nutricionistas Ativos</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">50k+</div>
                <div className="text-gray-600">Consultas Realizadas</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-600 mb-2">98%</div>
                <div className="text-gray-600">Taxa de Satisfação</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-orange-600 mb-2">24/7</div>
                <div className="text-gray-600">Disponibilidade</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Planos para todos os perfis
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Desde profissionais iniciantes até grandes clínicas, temos o plano ideal para você
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plano Básico */}
            <Card className="border-2 hover:border-green-300 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Básico</CardTitle>
                <CardDescription>Para nutricionistas iniciantes</CardDescription>
                <div className="text-3xl font-bold mt-4">Grátis</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>5 consultas por dia</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Acesso às principais funcionalidades</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Suporte por email</span>
                </div>
              </CardContent>
            </Card>

            {/* Plano Pro */}
            <Card className="border-2 border-green-500 shadow-lg scale-105">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600">
                Mais Popular
              </Badge>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Professional</CardTitle>
                <CardDescription>Para nutricionistas ativos</CardDescription>
                <div className="text-3xl font-bold mt-4">R$ 49/mês</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>50 consultas por dia</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Todas as funcionalidades</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Suporte prioritário</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Relatórios avançados</span>
                </div>
              </CardContent>
            </Card>

            {/* Plano Enterprise */}
            <Card className="border-2 hover:border-purple-300 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <CardDescription>Para clínicas e hospitais</CardDescription>
                <div className="text-3xl font-bold mt-4">R$ 199/mês</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Consultas ilimitadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>API personalizada</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Suporte 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Treinamento da equipe</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Link href="/plans">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                Ver Todos os Planos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* CTA Final */}
        <section className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Comece hoje mesmo sua transformação digital
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Junte-se a centenas de nutricionistas que já estão revolucionando 
              seus atendimentos com o poder da inteligência artificial.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/chat">
                <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">
                  Experimentar Grátis
                  <Zap className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/plans">
                <Button size="lg" variant="outline" className="px-8 py-3 text-lg border-white text-primary hover:bg-white hover:text-green-600">
                  Escolher Plano
                  <Users className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">NC</span>
              </div>
              <span className="font-bold text-xl">NutriChat</span>
            </div>
            <p className="text-gray-400 mb-4">
              Transformando a nutrição através da inteligência artificial
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <Link href="/terms" className="hover:text-white transition-colors">
                Termos de Uso
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacidade
              </Link>
              <Link href="/support" className="hover:text-white transition-colors">
                Suporte
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
