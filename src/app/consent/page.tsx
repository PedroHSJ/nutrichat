"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConsentOverlay } from '@/components/ConsentOverlay';
import { useAuth } from '@/context/AuthContext';

export default function ConsentPage() {
  const { hasConsent, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  // Se já deu consentimento, manda para o chat
  useEffect(() => {
    if (!authLoading && isAuthenticated && hasConsent) {
      router.replace('/chat');
    }
  }, [authLoading, isAuthenticated, hasConsent, router]);

  // Enquanto autenticação carrega
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }

  // Se não autenticado, redirecionar para login
  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  // Mostrar somente o overlay (ele já não renderiza se hasConsent for true)
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <ConsentOverlay />
    </div>
  );
}
