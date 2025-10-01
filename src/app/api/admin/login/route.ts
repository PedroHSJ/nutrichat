import { NextResponse } from 'next/server';
import { createAdminSession } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return NextResponse.json({ error: 'ADMIN_PASSWORD não configurado' }, { status: 500 });
    if (!password) return NextResponse.json({ error: 'Senha obrigatória' }, { status: 400 });
    if (password !== expected) return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });

  const ua = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('x-forwarded-for') || undefined;
  await createAdminSession(ua, undefined as any, { ip, userAgent: ua });
    return NextResponse.json({ success: true });
  } catch (e:any) {
    return NextResponse.json({ error: 'Erro ao processar login' }, { status: 500 });
  }
}
