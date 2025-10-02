import { NextResponse } from 'next/server';
import { createAdminSession } from '@/lib/admin-auth';

interface LoginBody { password?: string }

export async function POST(request: Request) {
  try {
  const { password } = (await request.json()) as LoginBody;
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return NextResponse.json({ error: 'ADMIN_PASSWORD não configurado' }, { status: 500 });
    if (!password) return NextResponse.json({ error: 'Senha obrigatória' }, { status: 400 });
    if (password !== expected) return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });

  const ua = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('x-forwarded-for') || undefined;
  await createAdminSession(ua, undefined, { ip, userAgent: ua });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao processar login' }, { status: 500 });
  }
}
