export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          session_id: string | null;
          consent_given: boolean | null;
          consent_date: string | null;
          data_retention_until: string | null;
          timezone: string | null;
          language: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          session_id?: string | null;
          consent_given?: boolean | null;
          consent_date?: string | null;
          data_retention_until?: string | null;
          timezone?: string | null;
          language?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          session_id?: string | null;
          consent_given?: boolean | null;
          consent_date?: string | null;
          data_retention_until?: string | null;
          timezone?: string | null;
          language?: string | null;
        };
      };
      chats: {
        Row: {
          id: string;
          user_id: string | null;
          created_at: string;
          updated_at: string;
          title_encrypted: string | null;
          title_hash: string | null;
          message_count: number | null;
          auto_delete_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          title_encrypted?: string | null;
          title_hash?: string | null;
          message_count?: number | null;
          auto_delete_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          title_encrypted?: string | null;
          title_hash?: string | null;
          message_count?: number | null;
          auto_delete_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string | null;
          created_at: string;
          content_encrypted: string;
          content_hash: string | null;
          role: string;
          tokens_used: number | null;
          sentiment: string | null;
          category: string | null;
        };
        Insert: {
          id?: string;
          chat_id?: string | null;
          created_at?: string;
          content_encrypted: string;
          content_hash?: string | null;
          role: string;
          tokens_used?: number | null;
          sentiment?: string | null;
          category?: string | null;
        };
        Update: {
          id?: string;
          chat_id?: string | null;
          created_at?: string;
          content_encrypted?: string;
          content_hash?: string | null;
          role?: string;
          tokens_used?: number | null;
          sentiment?: string | null;
          category?: string | null;
        };
      };
    };
    Views: {
      chat_analytics: {
        Row: {
          date: string | null;
          total_chats: number | null;
          avg_messages_per_chat: number | null;
          active_chats: number | null;
        };
      };
    };
    Functions: {
      cleanup_expired_data: {
        Args: Record<string, never>;
        Returns: number;
      };
      set_session_context: {
        Args: {
          session_id: string;
        };
        Returns: void;
      };
    };
  };
}

// Tipos específicos para a aplicação
export interface SupabaseUser {
  id: string;
  session_id: string;
  consent_given: boolean;
  created_at: string;
  updated_at: string;
  timezone?: string;
  language?: string;
}

export interface SupabaseChat {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  title_encrypted?: string;
  title_hash?: string;
  message_count: number;
  auto_delete_at?: string;
}

export interface SupabaseMessage {
  id: string;
  chat_id: string;
  created_at: string;
  content_encrypted: string;
  content_hash?: string;
  role: "user" | "assistant";
  tokens_used?: number;
  sentiment?: "positive" | "neutral" | "negative";
  category?: string;
}
