'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/context/ChatContext';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex gap-3 p-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      
      <div className={cn(
        "flex flex-col gap-2 max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
        <span className="text-xs text-muted-foreground">
          {format(message.timestamp, "HH:mm", { locale: ptBR })}
        </span>
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex gap-3 p-4">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl px-4 py-2 bg-muted">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processando sua solicitação...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Bot className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Bem-vindo ao NutriChat!</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Sou seu assistente especializado em nutrição. Posso ajudar com planejamento de refeições, 
          requisitos nutricionais, segurança alimentar e gestão de produção alimentar.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Digite uma mensagem abaixo para começar nossa conversa.
        </p>
      </div>
    </div>
  );
}

export function ChatArea() {
  const { currentChat, currentChatId, isLoading, sendMessage } = useChat();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const messageToSend = message.trim();
    setMessage('');
    
    // Passar o currentChatId para continuar no mesmo chat
    await sendMessage(messageToSend, currentChatId || undefined);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Área de mensagens */}
      <ScrollArea className="flex-1">
        {!currentChat || currentChat.messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="pb-4">
            {currentChat.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <LoadingMessage />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Área de input */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta sobre nutrição..."
              className="min-h-[50px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={!message.trim() || isLoading}
            className="h-[50px] w-[50px] shrink-0"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </div>
      </div>
    </div>
  );
}