'use client';

import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatArea } from '@/components/ChatArea';
import { ConsentOverlay } from '@/components/ConsentOverlay';
import { AuthForm } from '@/components/AuthForm';
import { RouteGuard } from '@/components/RouteGuard';
import { useChat } from '@/context/ChatContext';

function AuthenticatedApp() {
  return (
    <RouteGuard requiresPlan={true} redirectToPlans={true}>
      <SidebarProvider defaultOpen>
        <div className="flex h-screen w-full">
          <ChatSidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <ChatArea />
          </main>
        </div>
        <ConsentOverlay />
      </SidebarProvider>
    </RouteGuard>
  );
}

function UnauthenticatedApp() {
  const { login, signUp, authLoading, authError } = useChat();

  return (
    <AuthForm
      onLogin={login}
      onSignUp={signUp}
      isLoading={authLoading}
      error={authError}
    />
  );
}

export default function ChatPage() {
  const { isAuthenticated, authLoading, user } = useChat();

  // Mostrar loading durante verificação de autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando NutriChat...</p>
        </div>
      </div>
    );
  }

  // Mostrar app autenticado ou formulário de login
  if (isAuthenticated && user) {
    return <AuthenticatedApp />;
  } else {
    return <UnauthenticatedApp />;
  }
}