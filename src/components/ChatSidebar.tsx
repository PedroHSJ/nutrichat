'use client';

import React from 'react';
import { Plus, MessageCircle, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { APIStatusIndicator } from '@/components/APIStatusIndicator';
import { LGPDManager } from '@/components/LGPDManager';
import { InteractionStatusDisplay } from '@/components/InteractionStatusDisplay';
import { useVersion } from '@/hooks/use-version';
import { cn } from '@/lib/utils';

export function ChatSidebar() {
  const { chats, currentChatId, setCurrentChatId, deleteChat } = useChat();
  const { user, logout, interactionStatus } = useAuth();

  const { version, environment } = useVersion();

  const handleNewChat = () => {
    // Remover seleção atual para permitir começar novo chat
    setCurrentChatId(null);
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que o clique selecione o chat
    
    if (confirm('Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita.')) {
      try {
        await deleteChat(chatId);
      } catch (error) {
        console.error('Erro ao deletar chat:', error);
      }
    }
  };

  return (
    <Sidebar variant="inset" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">NutriChat</span>
              <span className="text-xs text-muted-foreground">Olá, {user?.name}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 w-8 p-0"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <div className="p-4">
          <Button 
            onClick={handleNewChat} 
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Novo Chat
          </Button>
        </div>

        <div className="px-4">
          <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Conversas Recentes
          </h3>
        </div>

        <ScrollArea className="flex-1 px-2">
          <SidebarMenu>
            {chats.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda.
                <br />
                Clique em &quot;Novo Chat&quot; para começar.
              </div>
            ) : (
              chats.map((chat) => (
                <SidebarMenuItem key={chat.id} className="group relative">
                  <SidebarMenuButton
                    onClick={() => handleSelectChat(chat.id)}
                    className={cn(
                      "w-full justify-start text-left h-auto py-3 px-3 pr-10", // pr-10 para espaço do botão
                      currentChatId === chat.id && "bg-accent"
                    )}
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1 pr-5">
                      <span className="text-sm font-medium truncate">
                        {chat.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{chat.messages.length} mensagens</span>
                        <span>•</span>
                        <span>
                          {format(chat.updatedAt, "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </SidebarMenuButton>
                  
                  {/* Botão posicionado de forma absoluta sobre o chat */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 z-20 rounded bg-red-200"
                    title="Deletar conversa"
                  >
                    ×
                  </Button>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <InteractionStatusDisplay 
          interactionStatus={interactionStatus}
          className="mb-2" 
        />
        <Separator />
        {process.env.NODE_ENV === 'development' && <APIStatusIndicator />}
        <LGPDManager />
        <div className="text-xs text-muted-foreground text-center">
          Especializado em Nutrição
          <br />
          Powered by AI
        </div>
        <div className="text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} NutriChat
        </div>
        <div className="text-xs text-muted-foreground text-center">
          v{version} {environment !== 'production' && `(${environment})`}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
