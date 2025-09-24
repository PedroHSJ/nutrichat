export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContextType {
  chats: Chat[];
  currentChatId: string | null;
  currentChat: Chat | null;
  isLoading: boolean;
  createChat: (firstMessage?: string) => Promise<string>;
  updateChat: (chatId: string, updates: Partial<Chat>) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  addMessage: (chatId: string, message: Message) => Promise<void>;
  sendMessage: (content: string, chatId?: string) => Promise<string>;
  setCurrentChatId: (chatId: string | null) => void;
}

export interface ApiResponse {
  message: string;
  error?: string;
}