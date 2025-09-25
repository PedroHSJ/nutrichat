'use client';

import { useChat } from '@/context/ChatContext';
import { Loader2 } from 'lucide-react';

export function GlobalLoader({ children }: { children: React.ReactNode }) {
  const { authLoading } = useChat();

  // Mostrar loading global enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}