import { useMemo } from 'react';

export function useAuthHeaders() {
  return useMemo(() => {
    // Verificar se estamos no navegador antes de acessar localStorage
    if (typeof window === 'undefined') {
      return {
        'Authorization': '',
        'X-Refresh-Token': '',
      };
    }

    // Obter tokens do localStorage
    const sessionData = localStorage.getItem('sb-cyjjxtlnvkbdwefgwmtd-auth-token');
    let accessToken = '';
    let refreshToken = '';

    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        accessToken = session.access_token;
        refreshToken = session.refresh_token;
      } catch (e) {
        console.error('Erro ao parsear sessão:', e);
      }
    }

    return {
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
      'X-Refresh-Token': refreshToken || '',
    };
  }, []);
}