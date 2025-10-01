import { NextRequest, NextResponse } from 'next/server';
import { UserSubscriptionService } from '@/lib/subscription';
import { authService } from '@/lib/auth';

// =====================================================
// INTERFACES E TIPOS
// =====================================================

/**
 * Interface para status de interação do usuário
 */
interface InteractionStatus {
  canInteract: boolean;
  remainingInteractions: number;
  dailyLimit: number;
  subscriptionStatus: 'active' | 'inactive' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | string;
  planName?: string;
  planType?: string;
  currentPeriodEnd?: Date;
  resetTime?: Date;
}

/**
 * Interface para configuração do middleware
 */
interface SubscriptionGuardConfig {
  requireSubscription?: boolean;
  checkInteractionLimit?: boolean;
  bypassInDevelopment?: boolean;
  customErrorMessage?: string;
}

// =====================================================
// MIDDLEWARE DE VALIDAÇÃO DE ASSINATURA  
// =====================================================

/**
 * Classe principal do middleware de validação
 */
export class SubscriptionGuard {
  
  /**
   * Middleware principal para validar assinaturas e limites
   * Use como guard em rotas que consomem interações
   */
  static async validateSubscription(
    request: NextRequest,
    config: SubscriptionGuardConfig = {}
  ): Promise<NextResponse | null> {
    
    const {
      requireSubscription = true,
      checkInteractionLimit = true,
      bypassInDevelopment = false,
      customErrorMessage
    } = config;
    
    try {
      // BYPASS PARA DESENVOLVIMENTO
      if (bypassInDevelopment && process.env.NODE_ENV === 'development') {
        console.log('[SUBSCRIPTION GUARD] Bypassing validation in development mode');
        return null; // Permite continuar
      }
      
      // Extrair token de autorização
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return this.createErrorResponse('Token de autenticação necessário', 401);
      }
      
      const token = authHeader.split(' ')[1];
      
      // Verificar se usuário está autenticado
      const user = await this.getUserFromToken(token);
      if (!user) {
        return this.createErrorResponse('Usuário não autenticado', 401);
      }
      
      // Se não precisa verificar assinatura, continuar
      if (!requireSubscription) {
        return null;
      }
      
      // Verificar status da assinatura e limites
      const status = await UserSubscriptionService.canUserInteract(user.id);
      
      // Se não pode interagir, retornar erro
      if (!status.canInteract) {
        const errorMessage = this.getErrorMessage(status, customErrorMessage);
        return this.createErrorResponse(errorMessage, 403);
      }
      
      // Se deve verificar limite de interações
      if (checkInteractionLimit && status.remainingInteractions <= 0) {
        return this.createErrorResponse(
          'Limite diário de interações atingido',
          429 // Too Many Requests
        );
      }
      
      // Adicionar informações do usuário e status no header para a rota
      const response = NextResponse.next();
      response.headers.set('x-user-id', user.id);
      response.headers.set('x-subscription-status', JSON.stringify(status));
      
      return null; // Permite continuar
      
    } catch (error) {
      console.error('[SUBSCRIPTION GUARD] Erro na validação:', error);
      return this.createErrorResponse(
        'Erro interno na validação de assinatura',
        500
      );
    }
  }
  
  /**
   * Guard específico para rotas de chat (consome interação)
   */
  static async validateChatInteraction(request: NextRequest): Promise<NextResponse | null> {
    return this.validateSubscription(request, {
      requireSubscription: true,
      checkInteractionLimit: true,
      bypassInDevelopment: true
    });
  }
  
  /**
   * Guard específico para rotas administrativas (sem consumir interação)
   */
  static async validateUserAccess(request: NextRequest): Promise<NextResponse | null> {
    return this.validateSubscription(request, {
      requireSubscription: false,
      checkInteractionLimit: false,
      bypassInDevelopment: true
    });
  }
  
  /**
   * Incrementar uso após interação bem-sucedida
   */
  static async incrementUsageAfterInteraction(userId: string): Promise<boolean> {
    try {
      // BYPASS PARA DESENVOLVIMENTO
      if (process.env.NODE_ENV === 'development') {
        console.log('[SUBSCRIPTION GUARD] Bypassing usage increment in development');
        return true;
      }
      
      return await UserSubscriptionService.incrementInteractionUsage(userId);
    } catch (error) {
      console.error('[SUBSCRIPTION GUARD] Erro ao incrementar uso:', error);
      return false;
    }
  }
  
  /**
   * Obter usuário pelo token JWT
   */
  private static async getUserFromToken(token: string) {
    try {
      // Implementar validação do JWT aqui
      // Por enquanto, usar uma implementação simples
      const user = await authService.getCurrentSession();
      return user;
    } catch (error) {
      console.error('[SUBSCRIPTION GUARD] Erro ao validar token:', error);
      return null;
    }
  }
  
  /**
   * Criar resposta de erro padronizada
   */
  private static createErrorResponse(message: string, status: number): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: status,
        timestamp: new Date().toISOString()
      },
      { status }
    );
  }
  
  /**
   * Obter mensagem de erro baseada no status
   */
  private static getErrorMessage(status: InteractionStatus, customMessage?: string): string {
    if (customMessage) return customMessage;
    
    switch (status.subscriptionStatus) {
      case 'inactive':
        return 'Você precisa de uma assinatura ativa para usar o NutriChat. Assine um plano para continuar.';
      case 'canceled':
        return 'Sua assinatura foi cancelada. Reative sua assinatura para continuar usando o serviço.';
      case 'past_due':
        return 'Sua assinatura está em atraso. Atualize suas informações de pagamento para continuar.';
      case 'unpaid':
        return 'Há um pagamento pendente em sua assinatura. Regularize para continuar usando o serviço.';
      case 'trialing':
        return 'Seu período de teste expirou. Assine um plano para continuar usando o NutriChat.';
      default:
        if (status.remainingInteractions <= 0) {
          return `Você atingiu o limite diário de ${status.dailyLimit} interações. Tente novamente amanhã ou faça upgrade do seu plano.`;
        }
        return 'Acesso negado. Verifique sua assinatura.';
    }
  }
}

// =====================================================
// HELPER FUNCTIONS PARA USAR EM API ROUTES
// =====================================================

/**
 * Wrapper para proteger API routes com validação de assinatura
 */
export function withSubscriptionGuard(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: SubscriptionGuardConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Aplicar validação
    const guardResult = await SubscriptionGuard.validateSubscription(req, config);
    
    // Se guard retornou erro, retornar erro
    if (guardResult) {
      return guardResult;
    }
    
    // Continuar com handler original
    return handler(req);
  };
}

/**
 * Wrapper específico para rotas de chat
 */
export function withChatGuard(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withSubscriptionGuard(handler, {
    requireSubscription: true,
    checkInteractionLimit: true,
    bypassInDevelopment: true
  });
}

/**
 * Hook para usar dentro de API routes para incrementar uso
 */
export async function incrementInteractionUsage(userId: string): Promise<void> {
  const success = await SubscriptionGuard.incrementUsageAfterInteraction(userId);
  if (!success && process.env.NODE_ENV !== 'development') {
    throw new Error('Falha ao registrar uso da interação');
  }
}

/**
 * Middleware Next.js para aplicar em rotas específicas
 */
export function createSubscriptionMiddleware(config?: SubscriptionGuardConfig) {
  return async (request: NextRequest) => {
    // Aplicar apenas em rotas específicas
    const protectedRoutes = ['/api/chat', '/api/subscription'];
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );
    
    if (!isProtectedRoute) {
      return NextResponse.next();
    }
    
    // Aplicar guard
    const guardResult = await SubscriptionGuard.validateSubscription(request, config);
    
    if (guardResult) {
      return guardResult;
    }
    
    return NextResponse.next();
  };
}

export default SubscriptionGuard;