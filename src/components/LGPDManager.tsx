'use client';

import React, { useState } from 'react';
import { Shield, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useChat } from '@/context/ChatContext';

export function LGPDManager() {
  const { hasConsent, requestConsent, deleteUserAccount, chats, exportUserData } = useChat();
  const [isOpen, setIsOpen] = useState(false);

  const handleRequestConsent = async () => {
    const consent = await requestConsent();
    if (consent) {
      setIsOpen(false);
    }
  };

  const handleRevokeConsent = async () => {
    if (confirm(
      'Tem certeza que deseja revogar seu consentimento? ' +
      'Todos os seus dados serão permanentemente excluídos e não poderão ser recuperados.'
    )) {
      await deleteUserAccount();
      setIsOpen(false);
    }
  };

  const handleExportData = async () => {
    try {
      await exportUserData();
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
          <Shield className="h-3 w-3" />
          <span className="text-xs">
            {hasConsent ? 'Dados Salvos' : 'Dados Temporários'}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacidade e Dados (LGPD)
          </SheetTitle>
          <SheetDescription>
            Gerencie seus dados e preferências de privacidade
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status atual */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-sm mb-2">Status Atual</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${hasConsent ? 'bg-green-500' : 'bg-orange-500'}`} />
              <span className="text-sm">
                {hasConsent ? 'Dados salvos com seu consentimento' : 'Dados apenas na sessão atual'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {hasConsent 
                ? 'Suas conversas são salvas criptografadas e excluídas automaticamente após 30 dias.'
                : 'Suas conversas existem apenas enquanto esta aba estiver aberta.'
              }
            </p>
          </div>

          {/* Estatísticas */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-sm mb-3">Seus Dados</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Conversas</p>
                <p className="font-medium">{chats.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mensagens</p>
                <p className="font-medium">
                  {chats.reduce((total, chat) => total + chat.messages.length, 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-3">
            {!hasConsent ? (
              <Button onClick={handleRequestConsent} className="w-full" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Permitir Salvamento de Dados
              </Button>
            ) : (
              <div className="space-y-2">
                <Button variant="outline" onClick={handleExportData} className="w-full" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Meus Dados
                </Button>
                
                <Button variant="destructive" onClick={handleRevokeConsent} className="w-full" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Todos os Dados
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Informações sobre proteção */}
          <div className="space-y-4 text-xs text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-1">🔒 Como protegemos seus dados</h4>
              <ul className="space-y-1 ml-2">
                <li>• Todas as mensagens são criptografadas</li>
                <li>• Não coletamos dados pessoais identificáveis</li>
                <li>• Exclusão automática após 30 dias</li>
                <li>• Acesso restrito apenas a você</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">📊 Dados que coletamos</h4>
              <ul className="space-y-1 ml-2">
                <li>• Conteúdo das mensagens (criptografado)</li>
                <li>• Horários das conversas</li>
                <li>• Categorias nutricionais (anônimas)</li>
                <li>• Estatísticas de uso (não identificáveis)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">⚖️ Seus direitos (LGPD)</h4>
              <ul className="space-y-1 ml-2">
                <li>• Acessar seus dados a qualquer momento</li>
                <li>• Exportar todos os seus dados</li>
                <li>• Revogar consentimento e excluir tudo</li>
                <li>• Solicitar informações sobre processamento</li>
              </ul>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <p className="text-xs text-muted-foreground">
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD)
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}