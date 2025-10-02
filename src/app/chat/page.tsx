'use client';

import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatArea } from '@/components/ChatArea';
import { TrialBanner } from '@/components/TrialBanner';
import { RouteGuard } from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';

function AuthenticatedApp() {
  return (
    <RouteGuard requiresPlan={true} redirectToPlans={true}>
      <SidebarProvider defaultOpen>
        <div className="flex h-screen w-full">
          <ChatSidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <TrialBanner />
            <ChatArea />
          </main>
        </div>
      </SidebarProvider>
    </RouteGuard>
  );
}

export default function ChatPage() {
  const { isAuthenticated, user } = useAuth();

  // Mostrar app autenticado ou formulário de login
  if (isAuthenticated && user) {
    return <AuthenticatedApp />;
  } 
}