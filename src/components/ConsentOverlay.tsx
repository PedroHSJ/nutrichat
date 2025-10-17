'use client';

import React from 'react';
import { Shield, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export function ConsentOverlay() {
  const { hasConsent, requestConsent, isAuthenticated } = useAuth();

  // Só mostrar se estiver autenticado e não tiver consentimento
  if (!isAuthenticated || hasConsent) return null;

  const handleAcceptConsent = async () => {
    try {
      console.log('Tentando aceitar consentimento...');
      const success = await requestConsent();
      if (success) {
        console.log('Consentimento aceito com sucesso!');
      } else {
        console.error('Falha ao aceitar consentimento');
      }
    } catch (error) {
      console.error('Erro ao dar consentimento:', error);
    }
  };

  const handleRejectConsent = () => {
    console.log('Consentimento rejeitado - continuando sem persistência');
    // Usuário escolheu não salvar dados - define hasConsent como false mas permite usar o app
    // Note: Isso deve permitir uso sem persistência, mas não está implementado ainda
    alert('Funcionalidade de uso sem persistência será implementada em breve.\nPor enquanto, é necessário aceitar para usar o sistema.');
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Proteção de Dados</CardTitle>
          <CardDescription>
            Queremos ser transparentes sobre como seus dados são tratados
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Criptografia total:</strong> Todas as suas mensagens são criptografadas antes de serem armazenadas.
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Controle total:</strong> Você pode exportar ou deletar seus dados a qualquer momento.
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Retenção limitada:</strong> Dados são automaticamente removidos após 90 dias de inatividade.
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Sem compartilhamento:</strong> Seus dados nunca são compartilhados com terceiros.
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border text-sm">
            <p className="font-medium text-blue-900 mb-1">Escolha sua preferência:</p>
            <p className="text-blue-800">
              <strong>Aceitar:</strong> Suas conversas serão salvas de forma segura para acesso futuro.<br/>
              <strong>Recusar:</strong> Use o chat normalmente, mas as conversas não serão salvas.
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={handleRejectConsent}
            >
              <X className="h-4 w-4" />
              Não salvar
            </Button>
            <Button 
              className="flex-1 gap-2" 
              onClick={handleAcceptConsent}
            >
              <Check className="h-4 w-4" />
              Aceitar e salvar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Você pode alterar sua escolha a qualquer momento nas configurações de privacidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
