"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";

export default function SubscriptionCanceledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <CardTitle className="text-xl text-gray-700">
            Assinatura Cancelada
          </CardTitle>
          <CardDescription>
            Você cancelou o processo de assinatura
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Não se preocupe! Você pode retornar e assinar a qualquer
                momento.
              </p>
              <p className="text-sm text-muted-foreground">
                Nenhuma cobrança foi realizada.
              </p>
            </div>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/plans">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Ver Planos Novamente
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Início
                </Link>
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">
                💡 Por que assinar?
              </h4>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• Interações ilimitadas com IA especializada</li>
                <li>• Suporte nutricional personalizado</li>
                <li>• Acesso a recursos premium</li>
                <li>• Cancele a qualquer momento</li>
              </ul>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Dúvidas? Entre em contato conosco!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
