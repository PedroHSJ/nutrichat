'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Chat, Message, ChatContextType } from '@/types/chat';
import { generateId } from '@/lib/utils';
import { chatPersistence } from '@/lib/persistence';
import { authService, AuthUser } from '@/lib/auth';
import { UserSubscriptionService } from '@/lib/subscription';
import { UserInteractionStatus } from '@/types/subscription';

interface AuthContextType extends ChatContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authLoading: boolean;
  authError: string | null;
  hasConsent: boolean;
  requestConsent: () => Promise<boolean>;
  exportUserData: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  // Controle de interações diárias
  interactionStatus: UserInteractionStatus | null;
  refreshInteractionStatus: () => Promise<void>;
}

const ChatContext = createContext<AuthContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  
  // Estados do chat
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de autenticação
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  
  // Estado de controle de interações diárias
  const [interactionStatus, setInteractionStatus] = useState<UserInteractionStatus | null>(null);

  const currentChat = chats.find(chat => chat.id === currentChatId) || null;

  // Inicializar autenticação
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setAuthLoading(true);
        
        // Verificar sessão existente
        const currentUser = await authService.getCurrentSession();
        
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // Inicializar persistência
          await chatPersistence.initialize(currentUser);
          
          // Verificar consentimento
          const consent = await authService.hasConsent();
          setHasConsent(consent);
          
          if (consent) {
            // Carregar chats salvos
            const savedChats = await chatPersistence.loadChats();
            setChats(savedChats);
          }
        }
      } catch (error) {
        console.error('Erro na inicialização de autenticação:', error);
        setAuthError('Erro ao verificar sessão');
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // Escutar mudanças de autenticação
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setIsAuthenticated(authUser !== null);
      
      if (!authUser) {
        // Limpar dados quando fizer logout
        setChats([]);
        setCurrentChatId(null);
        setHasConsent(false);
      }
    });

    return unsubscribe;
  }, []);

  // Função de login
  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      
      const authUser = await authService.signIn(email, password);
      setUser(authUser);
      setIsAuthenticated(true);
      
      // Inicializar persistência
      await chatPersistence.initialize(authUser);
      
      // Verificar consentimento
      const consent = await authService.hasConsent();
      setHasConsent(consent);
      
      if (consent) {
        // Carregar chats salvos
        const savedChats = await chatPersistence.loadChats();
        setChats(savedChats);
      }

      // Verificar se o usuário tem um plano ativo
      const interactionStatus = await UserSubscriptionService.canUserInteract(authUser.id);
      setInteractionStatus(interactionStatus);
      
      // Redirecionar para planos se não tiver plano ativo
      if (!interactionStatus.canInteract && interactionStatus.planType === 'free') {
        // Usuário não tem plano, redirecionar para página de planos
        router.push('/plans');
        return;
      }
      
      // Se tem plano ativo, redirecionar para chat
      if (consent && interactionStatus.canInteract) {
        router.push('/chat');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no login';
      setAuthError(errorMessage);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  // Função de cadastro
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    console.log('SignUp function called with:', { name, email, password: '***' });
    
    try {
      setAuthLoading(true);
      setAuthError(null);
      
      console.log('Calling authService.signUp...');
      const authUser = await authService.signUp(name, email, password);
      console.log('AuthService signUp completed:', authUser);
      
      setUser(authUser);
      setIsAuthenticated(true);
      
      // Inicializar persistência
      await chatPersistence.initialize(authUser);
      
      // Novo usuário ainda não deu consentimento
      setHasConsent(false);
      
      // Verificar status de assinatura (novos usuários normalmente não terão plano)
      const interactionStatus = await UserSubscriptionService.canUserInteract(authUser.id);
      setInteractionStatus(interactionStatus);
      
      console.log('SignUp process completed successfully');
      
      // Novos usuários sempre são redirecionados para planos
      router.push('/plans');
      
    } catch (error) {
      console.error('Error in signUp function:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro no cadastro';
      setAuthError(errorMessage);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  // Função de logout
  const logout = useCallback(async () => {
    try {
      setAuthLoading(true);
      await authService.signOut();
      
      // Limpar estados
      setUser(null);
      setIsAuthenticated(false);
      setChats([]);
      setCurrentChatId(null);
      setHasConsent(false);
      setAuthError(null);
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Solicitar consentimento LGPD
  const requestConsent = useCallback(async () => {
    console.log('requestConsent chamado - isAuthenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.error('Usuário não autenticado, não é possível dar consentimento');
      return false;
    }

    try {
      console.log('Chamando authService.giveConsent()...');
      await authService.giveConsent();
      console.log('authService.giveConsent() executado com sucesso');
      setHasConsent(true);
      console.log('hasConsent definido como true');
      return true;
    } catch (error) {
      console.error('Erro ao dar consentimento:', error);
      console.error('Detalhes do erro:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [isAuthenticated]);

  // Exportar dados do usuário
  const exportUserData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const data = await chatPersistence.exportUserData();
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nutrichat-dados-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      throw error;
    }
  }, [isAuthenticated]);

  // Deletar conta e todos os dados
  const deleteUserAccount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await chatPersistence.deleteAllUserData();
      
      // Limpar estados após exclusão
      setUser(null);
      setIsAuthenticated(false);
      setChats([]);
      setCurrentChatId(null);
      setHasConsent(false);
      setAuthError(null);
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      throw error;
    }
  }, [isAuthenticated]);

  // Criar novo chat
  const createChat = useCallback(async (firstMessage?: string) => {
    const newChat: Chat = {
      id: generateId(),
      title: firstMessage ? (firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage) : 'Nova conversa',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setChats(prevChats => [newChat, ...prevChats]);
    setCurrentChatId(newChat.id);

    // Salvar se tiver consentimento
    if (hasConsent && isAuthenticated) {
      try {
        await chatPersistence.saveChat(newChat);
      } catch (error) {
        console.error('Erro ao salvar novo chat:', error);
      }
    }

    return newChat.id;
  }, [hasConsent, isAuthenticated]);

  // Atualizar chat
  const updateChat = useCallback(async (chatId: string, updates: Partial<Chat>) => {
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId
          ? { ...chat, ...updates, updatedAt: new Date() }
          : chat
      )
    );

    // Salvar se tiver consentimento
    if (hasConsent && isAuthenticated) {
      try {
        const updatedChat = chats.find(c => c.id === chatId);
        if (updatedChat) {
          await chatPersistence.saveChat({ ...updatedChat, ...updates, updatedAt: new Date() });
        }
      } catch (error) {
        console.error('Erro ao atualizar chat:', error);
      }
    }
  }, [chats, hasConsent, isAuthenticated]);

  // Atualizar status de interações
  const refreshInteractionStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setInteractionStatus(null);
      return;
    }

    try {
      const status = await UserSubscriptionService.canUserInteract(user.id);
      setInteractionStatus(status);
    } catch (error) {
      console.error('Erro ao buscar status de interações:', error);
    }
  }, [isAuthenticated, user]);

  // Atualizar status de interações quando usuário fizer login
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshInteractionStatus();
    } else {
      setInteractionStatus(null);
    }
  }, [isAuthenticated, user, refreshInteractionStatus]);

  // Deletar chat
  const deleteChat = useCallback(async (chatId: string) => {
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }

    // Deletar no banco se tiver consentimento
    if (hasConsent && isAuthenticated) {
      try {
        await chatPersistence.deleteChat(chatId);
      } catch (error) {
        console.error('Erro ao deletar chat:', error);
      }
    }
  }, [currentChatId, hasConsent, isAuthenticated]);

  // Adicionar mensagem
  const addMessage = useCallback(async (chatId: string, message: Message) => {
    console.log('Adicionando mensagem ao chat:', chatId, 'hasConsent:', hasConsent);
    
    // Primeiro, atualizar o estado local
    let updatedMessages: Message[] = [];
    setChats(prevChats =>
      prevChats.map(chat => {
        if (chat.id === chatId) {
          updatedMessages = [...chat.messages, message];
          return {
            ...chat,
            messages: updatedMessages,
            updatedAt: new Date(),
          };
        }
        return chat;
      })
    );

    // Salvar mensagens se tiver consentimento (usar as mensagens atualizadas)
    if (hasConsent && isAuthenticated && updatedMessages.length > 0) {
      try {
        console.log(`Salvando ${updatedMessages.length} mensagens para chat ${chatId}`);
        await chatPersistence.saveMessages(chatId, updatedMessages);
      } catch (error) {
        console.error('Erro ao salvar mensagem:', error);
      }
    }
  }, [chats, hasConsent, isAuthenticated]);

  // Enviar mensagem para API
  const sendMessage = useCallback(async (content: string, chatId?: string) => {
    try {
      setIsLoading(true);

      // Verificar limite de interações antes de enviar
      if (isAuthenticated && user) {
        const { canInteract } = await UserSubscriptionService.canUserInteract(user.id);
        if (!canInteract) {
          throw new Error('Você atingiu o limite diário de interações. Tente novamente amanhã ou upgrade seu plano.');
        }
      }

      let targetChatId = chatId;
      if (!targetChatId) {
        targetChatId = await createChat(content);
      }

      const userMessage: Message = {
        id: generateId(),
        content,
        role: 'user',
        timestamp: new Date(),
      };

      await addMessage(targetChatId, userMessage);

      // Incrementar contador de interações ANTES de chamar a API
      if (isAuthenticated && user) {
        await UserSubscriptionService.incrementInteractionUsage(user.id);
        // Atualizar status local
        await refreshInteractionStatus();
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: content, 
          chatHistory: chats.find(c => c.id === targetChatId)?.messages || [] 
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação com a IA');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: generateId(),
        content: data.message, // Corrigido: era data.response, mas API retorna data.message
        role: 'assistant',
        timestamp: new Date(),
      };

      await addMessage(targetChatId, assistantMessage);

      return targetChatId;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [chats, createChat, addMessage, isAuthenticated, user, refreshInteractionStatus]);

  const value: AuthContextType = {
    // Estados do chat
    chats,
    currentChat,
    currentChatId,
    isLoading,
    
    // Estados de autenticação
    user,
    isAuthenticated,
    authLoading,
    authError,
    hasConsent,

    // Controle de interações diárias
    interactionStatus,
    refreshInteractionStatus,

    // Funções de autenticação
    login,
    signUp,
    logout,
    requestConsent,
    exportUserData,
    deleteUserAccount,

    // Funções do chat
    createChat,
    updateChat,
    deleteChat,
    addMessage,
    sendMessage,
    setCurrentChatId,
  };

  useEffect(() => {
    console.log("loading state changed:", isLoading);
  }, [isLoading]);  

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): AuthContextType {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}