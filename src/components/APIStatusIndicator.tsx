'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger 
} from '@/components/ui/sheet';

interface APIStatus {
  provider: string;
  status: 'connected' | 'error' | 'unknown';
}

export function APIStatusIndicator() {
  const [apiStatus, setApiStatus] = useState<APIStatus>({ 
    provider: 'Desconhecido', 
    status: 'unknown' 
  });

  const checkAPIStatus = async () => {
    try {
      const response = await fetch('/api/status');
      if (response.ok) {
        const data = await response.json();
        setApiStatus({
          provider: data.provider || 'Desconhecido',
          status: 'connected'
        });
      } else {
        setApiStatus(prev => ({ ...prev, status: 'error' }));
      }
    } catch {
      setApiStatus(prev => ({ ...prev, status: 'error' }));
    }
  };

  useEffect(() => {
    checkAPIStatus();
  }, []);

  const getStatusIcon = () => {
    switch (apiStatus.status) {
      case 'connected':
        return <Zap className="h-3 w-3 text-green-500" />;
      case 'error':
        return <Zap className="h-3 w-3 text-red-500" />;
      default:
        return <Cpu className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (apiStatus.status) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
          {getStatusIcon()}
          <span className={`text-xs ${getStatusColor()}`}>
            {apiStatus.provider}
          </span>
          <Settings className="h-3 w-3 ml-auto text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Configurações da API</SheetTitle>
          <SheetDescription>
            Status da conexão com os serviços de IA
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="font-medium text-sm">{apiStatus.provider}</p>
              <p className={`text-xs ${getStatusColor()}`}>
                {apiStatus.status === 'connected' && 'Conectado'}
                {apiStatus.status === 'error' && 'Erro de conexão'}
                {apiStatus.status === 'unknown' && 'Status desconhecido'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={checkAPIStatus}
            >
              Testar
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-2">
            <p><strong>Para alternar entre APIs:</strong></p>
            <p>1. Configure as variáveis no arquivo <code>.env.local</code></p>
            <p>2. Defina <code>AI_PROVIDER</code> como:</p>
            <ul className="ml-4 space-y-1">
              <li>• <code>openai</code> para ChatGPT</li>
              <li>• <code>github</code> para GitHub Models</li>
            </ul>
            <p>3. Reinicie o servidor de desenvolvimento</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}