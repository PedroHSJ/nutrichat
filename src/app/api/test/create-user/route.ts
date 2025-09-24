import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/stripe';
import { UserSubscriptionService } from '@/lib/subscription';
import { authService } from '@/lib/auth';

/**
 * POST /api/test/create-user
 * Criar usuário de teste
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se está em desenvolvimento
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Esta rota está disponível apenas em desenvolvimento' },
        { status: 403 }
      );
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    try {
      // Criar usuário usando o authService
      const user = await authService.signUp(name, email, password);

      return NextResponse.json({
        success: true,
        message: 'Usuário criado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });

    } catch (error) {
      console.error('[TEST] Erro ao criar usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[TEST] Erro na rota de criar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}