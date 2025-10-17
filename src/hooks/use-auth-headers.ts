'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AuthHeaders = Record<string, string> & {
  Authorization: string;
  'X-Refresh-Token': string;
};

const STORAGE_KEY = 'sb-cyjjxtlnvkbdwefgwmtd-auth-token';

function readStoredHeaders(): AuthHeaders {
  if (typeof window === 'undefined') {
    return {
      Authorization: '',
      'X-Refresh-Token': '',
    };
  }

  const sessionData = localStorage.getItem(STORAGE_KEY);
  let accessToken = '';
  let refreshToken = '';

  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      accessToken = session?.access_token ?? '';
      refreshToken = session?.refresh_token ?? '';
    } catch (error) {
      console.error('Erro ao ler sessão do Supabase:', error);
    }
  }

  return {
    Authorization: accessToken ? `Bearer ${accessToken}` : '',
    'X-Refresh-Token': refreshToken || '',
  };
}

export function useAuthHeaders(): AuthHeaders {
  const [headers, setHeaders] = useState<AuthHeaders>(() => readStoredHeaders());

  useEffect(() => {
    const updateHeaders = () => {
      setHeaders(readStoredHeaders());
    };

    updateHeaders();

    if (typeof window !== 'undefined') {
      const handleStorage = (event: StorageEvent) => {
        if (!event.key || event.key === STORAGE_KEY) {
          updateHeaders();
        }
      };

      window.addEventListener('storage', handleStorage);
      return () => {
        window.removeEventListener('storage', handleStorage);
      };
    }

    return undefined;
  }, []);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      setHeaders(readStoredHeaders());
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return headers;
}

export function getStoredAuthHeaders(): AuthHeaders {
  return readStoredHeaders();
}
