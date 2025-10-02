import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token de autorização é obrigatório' },
        { status: 401 }
      );
    }

    const token = authorization.replace('Bearer ', '');
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase não configurado' },
        { status: 500 }
      );
    }

    // Verificar o token e pegar o usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Buscar consentimento do usuário
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('consent_given')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil do usuário:', profileError);
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar consentimento' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hasConsent: profile?.consent_given || false
    });

  } catch (error) {
    console.error('Erro na API de consentimento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}