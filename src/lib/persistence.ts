import { Chat, Message } from '@/types/chat';
import { supabase, encryptSensitiveData, decryptSensitiveData } from '@/lib/supabase';
import { authService, AuthUser } from '@/lib/auth';

export class ChatPersistenceService {
  private currentUser: AuthUser | null = null;

  // Verificar se Supabase está configurado
  private isSupabaseConfigured(): boolean {
    return supabase !== null;
  }

  // Inicializar com usuário autenticado
  async initialize(user: AuthUser): Promise<void> {
    this.currentUser = user;
    console.log('Persistência inicializada para usuário:', user.name);
  }

  // Verificar se está pronto para persistir
  private canPersist(): boolean {
    return this.isSupabaseConfigured() && this.currentUser !== null;
  }

  // Salvar chat
  async saveChat(chat: Chat): Promise<void> {
    if (!this.canPersist()) {
      console.warn('Persistência não disponível - dados não serão salvos');
      return;
    }

    try {
      const { encrypted: titleEncrypted, hash: titleHash } = await encryptSensitiveData(chat.title);

      const supabaseChat = {
        id: chat.id,
        user_id: this.currentUser!.id,
        title_encrypted: titleEncrypted,
        title_hash: titleHash,
        message_count: chat.messages.length,
        created_at: chat.createdAt.toISOString(),
        updated_at: chat.updatedAt.toISOString()
      };

      const { error } = await supabase!
        .from('chats')
        .upsert(supabaseChat);

      if (error) {
        console.error('Erro ao salvar chat:', error);
        throw new Error('Falha ao salvar conversa');
      }
    } catch (error) {
      console.error('Erro na operação de salvar chat:', error);
      throw error;
    }
  }

  // Salvar mensagens
  async saveMessages(chatId: string, messages: Message[]): Promise<void> {
    if (!this.canPersist()) {
      console.warn('Persistência não disponível - mensagens não serão salvas');
      return;
    }

    try {
      console.log(`Tentando salvar ${messages.length} mensagens para chat ${chatId}`);
      const supabaseMessages = [];

      for (const message of messages) {
        const { encrypted: contentEncrypted, hash: contentHash } = await encryptSensitiveData(message.content);

        supabaseMessages.push({
          id: message.id,
          chat_id: chatId,
          content_encrypted: contentEncrypted,
          content_hash: contentHash,
          role: message.role,
          created_at: message.timestamp.toISOString(), // Removido timestamp duplicado
        });
      }

      console.log('Dados das mensagens preparados:', supabaseMessages.map(m => ({ id: m.id, chat_id: m.chat_id, role: m.role })));

      const { error } = await supabase!
        .from('messages')
        .upsert(supabaseMessages);

      if (error) {
        console.error('Erro ao salvar mensagens:', error);
        throw new Error('Falha ao salvar mensagens');
      }
      
      console.log(`✅ ${messages.length} mensagens salvas com sucesso para chat ${chatId}`);
    } catch (error) {
      console.error('Erro na operação de salvar mensagens:', error);
      throw error;
    }
  }

  // Carregar todos os chats do usuário
  async loadChats(): Promise<Chat[]> {
    if (!this.canPersist()) {
      console.warn('Persistência não disponível - retornando array vazio');
      return [];
    }

    try {
      console.log('Carregando chats do usuário:', this.currentUser!.id);
      const { data: chatsData, error } = await supabase!
        .from('chats')
        .select(`
          id,
          title_encrypted,
          created_at,
          updated_at,
          user_id,
          messages!messages_chat_id_fkey (
            id,
            content_encrypted,
            role,
            created_at
          )
        `)
        .eq('user_id', this.currentUser!.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar chats:', error);
        return [];
      }    

      const chats: Chat[] = [];

      for (const chatData of chatsData || []) {
        const messages: Message[] = [];

        // Tipar a relação messages (join) vinda do select composto
        type RawMessageRow = { id: string; content_encrypted: string; role: Message['role']; created_at: string };
        const rawMessages: RawMessageRow[] = (chatData as unknown as { messages?: RawMessageRow[] }).messages || [];
        for (const msgData of rawMessages) {
          try {
            const decryptedContent = decryptSensitiveData(msgData.content_encrypted);
            messages.push({
              id: msgData.id,
              content: decryptedContent,
              role: msgData.role,
              timestamp: new Date(msgData.created_at), // Usar created_at em vez de timestamp
            });
          } catch (error) {
            console.error('Erro ao descriptografar mensagem:', msgData.id, error);
          }
        }

        // Descriptografar título do chat
        try {
          console.log('Descriptografando título do chat:', chatData.id);
          const decryptedTitle = await decryptSensitiveData(chatData.title_encrypted);
          const chatWithMessages = {
            id: chatData.id,
            title: decryptedTitle,
            messages: messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
            createdAt: new Date(chatData.created_at),
            updatedAt: new Date(chatData.updated_at),
          };
          chats.push(chatWithMessages);
          console.log(`Chat ${chatData.id} adicionado com ${messages.length} mensagens`);
        } catch (error) {
          console.error('Erro ao descriptografar título do chat:', chatData.id, error);
        }
      }

      console.log(`Retornando ${chats.length} chats carregados`);
      return chats;
    } catch (error) {
      console.error('Erro na operação de carregar chats:', error);
      return [];
    }
  }

  // Deletar chat específico
  async deleteChat(chatId: string): Promise<void> {
    if (!this.canPersist()) return;

    try {
      const { error } = await supabase!
        .from('chats')
        .delete()
        .eq('id', chatId)
        .eq('user_id', this.currentUser!.id);

      if (error) {
        console.error('Erro ao deletar chat:', error);
        throw new Error('Falha ao deletar conversa');
      }
    } catch (error) {
      console.error('Erro na operação de deletar chat:', error);
      throw error;
    }
  }

  // Obter estatísticas do usuário
  async getUserStats(): Promise<{
    totalChats: number;
    totalMessages: number;
    oldestChat?: Date;
    newestChat?: Date;
  }> {
    if (!this.canPersist()) {
      return { totalChats: 0, totalMessages: 0 };
    }

    try {
      // Contar chats
      const { count: chatsCount, error: chatsError } = await supabase!
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.currentUser!.id);

      if (chatsError) {
        console.error('Erro ao contar chats:', chatsError);
        return { totalChats: 0, totalMessages: 0 };
      }

      // Contar mensagens do usuário
      const { data: userChats } = await supabase!
        .from('chats')
        .select('id')
        .eq('user_id', this.currentUser!.id);

      const chatIds = userChats?.map(chat => chat.id) || [];
      
      let messagesCount = 0;
      if (chatIds.length > 0) {
        const { count, error: messagesError } = await supabase!
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('chat_id', chatIds);
          
        if (messagesError) {
          console.error('Erro ao contar mensagens:', messagesError);
        } else {
          messagesCount = count || 0;
        }
      }

      // Buscar datas dos chats
      const { data: dateData, error: dateError } = await supabase!
        .from('chats')
        .select('created_at')
        .eq('user_id', this.currentUser!.id)
        .order('created_at', { ascending: true });

      let oldestChat, newestChat;
      if (!dateError && dateData?.length) {
        oldestChat = new Date(dateData[0].created_at);
        newestChat = new Date(dateData[dateData.length - 1].created_at);
      }

      return {
        totalChats: chatsCount || 0,
        totalMessages: messagesCount || 0,
        oldestChat,
        newestChat,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return { totalChats: 0, totalMessages: 0 };
    }
  }

  // Exportar dados do usuário (usa função do authService)
  async exportUserData(): Promise<Record<string, unknown> | null> {
    return await authService.exportUserData();
  }

  // Limpar dados do usuário (delegado para authService)
  async deleteAllUserData(): Promise<void> {
    await authService.deleteAccount();
    this.currentUser = null;
  }

  // Obter usuário atual
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }
}

// Instância singleton
export const chatPersistence = new ChatPersistenceService();