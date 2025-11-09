"use client";

import { AlertCircle, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface NoPlanWarningProps {
  onSelectPlan?: () => void;
  className?: string;
}

export function NoPlanWarning({
  onSelectPlan,
  className = "",
}: NoPlanWarningProps) {
  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-orange-800">Plano Necessário</CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          Para começar a usar o NutriChat, você precisa selecionar um plano de
          assinatura.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-orange-700">
            <p className="mb-2">
              <strong>Com um plano ativo você terá acesso a:</strong>
            </p>
            <ul className="space-y-1 ml-4">
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-orange-600" />
                Conversas ilimitadas com o assistente nutricional
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-orange-600" />
                Recomendações personalizadas
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-orange-600" />
                Histórico de conversas salvo
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-orange-600" />
                Suporte prioritário
              </li>
            </ul>
          </div>

          {onSelectPlan && (
            <Button
              onClick={onSelectPlan}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              Escolher Plano
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
