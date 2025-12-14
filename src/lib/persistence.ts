import { Chat, Message } from "@/types/chat";
import type { AuthUser } from "@/types/auth";

export class ChatPersistenceService {
  private currentUser: AuthUser | null = null;

  // Verificar se Supabase está configurado
  private isSupabaseConfigured(): boolean {
    return false;
  }

  // Inicializar com usuário autenticado
  async initialize(user: AuthUser): Promise<void> {
    this.currentUser = user;
  }

  // Verificar se está pronto para persistir
  private canPersist(): boolean {
    return this.isSupabaseConfigured() && this.currentUser !== null;
  }

  // Salvar chat
  async saveChat(chat: Chat): Promise<void> {
    console.warn(
      "[ChatPersistenceService] saveChat desabilitado no client. Use APIs server-side para persistir.",
      { chatId: chat.id },
    );
    return;
  }

  // Salvar mensagens
  async saveMessages(chatId: string, messages: Message[]): Promise<void> {
    console.warn(
      "[ChatPersistenceService] saveMessages desabilitado no client. Use APIs server-side para persistir.",
      { chatId, count: messages.length },
    );
    return;
  }

  // Carregar todos os chats do usuário
  async loadChats(): Promise<Chat[]> {
    console.warn(
      "[ChatPersistenceService] loadChats desabilitado no client. Busque dados via API server-side.",
    );
    return [];
  }

  // Deletar chat específico
  async deleteChat(chatId: string): Promise<void> {
    console.warn(
      "[ChatPersistenceService] deleteChat desabilitado no client. Use API server-side.",
      { chatId },
    );
    return;
  }

  // Obter estatísticas do usuário
  async getUserStats(): Promise<{
    totalChats: number;
    totalMessages: number;
    oldestChat?: Date;
    newestChat?: Date;
  }> {
    console.warn(
      "[ChatPersistenceService] getUserStats desabilitado no client. Use API server-side.",
    );
    return { totalChats: 0, totalMessages: 0 };
  }

  // Obter usuário atual
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }
}

// Instância singleton
export const chatPersistence = new ChatPersistenceService();
