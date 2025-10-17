'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { Chat, Message, ChatContextType } from '@/types/chat';
import { generateId } from '@/lib/utils';
import { chatPersistence } from '@/lib/persistence';
import { useAuthHeaders } from '@/hooks/use-auth-headers';
import { useAuth } from '@/context/AuthContext';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, hasConsent, refreshInteractionStatus } = useAuth();
  const authHeaders = useAuthHeaders();

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentChat = useMemo(
    () => chats.find((chat) => chat.id === currentChatId) || null,
    [chats, currentChatId]
  );

  useEffect(() => {
    let isMounted = true;

    const syncChats = async () => {
      if (!user || !isAuthenticated) {
        if (isMounted) {
          setChats([]);
          setCurrentChatId(null);
        }
        return;
      }

      try {
        await chatPersistence.initialize(user);

        if (!hasConsent) {
          if (isMounted) {
            setChats([]);
            setCurrentChatId(null);
          }
          return;
        }

        const savedChats = await chatPersistence.loadChats();
        if (isMounted) {
          setChats(savedChats);
        }
      } catch (error) {
        console.error('Erro ao sincronizar conversas:', error);
        if (isMounted) {
          setChats([]);
        }
      }
    };

    syncChats();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, hasConsent]);

  const createChat = useCallback(
    async (firstMessage?: string) => {
      const newChat: Chat = {
        id: generateId(),
        title: firstMessage
          ? firstMessage.length > 50
            ? `${firstMessage.substring(0, 50)}...`
            : firstMessage
          : 'Nova conversa',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setChats((prevChats) => [newChat, ...prevChats]);
      setCurrentChatId(newChat.id);

      if (hasConsent && isAuthenticated) {
        try {
          await chatPersistence.saveChat(newChat);
        } catch (error) {
          console.error('Erro ao salvar novo chat:', error);
        }
      }

      return newChat.id;
    },
    [hasConsent, isAuthenticated]
  );

  const updateChat = useCallback(
    async (chatId: string, updates: Partial<Chat>) => {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === chatId ? { ...chat, ...updates, updatedAt: new Date() } : chat
        )
      );

      if (hasConsent && isAuthenticated) {
        try {
          const existingChat = chats.find((chat) => chat.id === chatId);
          if (existingChat) {
            await chatPersistence.saveChat({
              ...existingChat,
              ...updates,
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Erro ao atualizar chat:', error);
        }
      }
    },
    [chats, hasConsent, isAuthenticated]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));

      setCurrentChatId((prev) => (prev === chatId ? null : prev));

      if (hasConsent && isAuthenticated) {
        try {
          await chatPersistence.deleteChat(chatId);
        } catch (error) {
          console.error('Erro ao deletar chat:', error);
        }
      }
    },
    [hasConsent, isAuthenticated]
  );

  const addMessage = useCallback(
    async (chatId: string, message: Message) => {
      let updatedMessages: Message[] = [];

      setChats((prevChats) =>
        prevChats.map((chat) => {
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

      if (hasConsent && isAuthenticated && updatedMessages.length > 0) {
        try {
          await chatPersistence.saveMessages(chatId, updatedMessages);
        } catch (error) {
          console.error('Erro ao salvar mensagem:', error);
        }
      }
    },
    [hasConsent, isAuthenticated]
  );

  const sendMessage = useCallback(
    async (content: string, chatId?: string) => {
      try {
        setIsLoading(true);

        if (isAuthenticated && user) {
          const statusResponse = await fetch('/api/subscription/status', {
            headers: authHeaders,
          });
          const status = statusResponse.ok ? await statusResponse.json() : null;
          if (!status?.canInteract) {
            throw new Error(
              'Você atingiu o limite diário de interações. Tente novamente amanhã ou faça upgrade do seu plano.'
            );
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

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            message: content,
            chatHistory: chats.find((c) => c.id === targetChatId)?.messages || [],
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
          content: data.message,
          role: 'assistant',
          timestamp: new Date(),
        };

        await addMessage(targetChatId, assistantMessage);

        if (isAuthenticated && user) {
          await refreshInteractionStatus();
        }

        return targetChatId;
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [authHeaders, addMessage, chats, createChat, isAuthenticated, refreshInteractionStatus, user]
  );

  const value = useMemo<ChatContextType>(
    () => ({
      chats,
      currentChat,
      currentChatId,
      isLoading,
      createChat,
      updateChat,
      deleteChat,
      addMessage,
      sendMessage,
      setCurrentChatId,
    }),
    [
      addMessage,
      chats,
      createChat,
      currentChat,
      currentChatId,
      deleteChat,
      isLoading,
      sendMessage,
      setCurrentChatId,
      updateChat,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);

  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }

  return context;
}
