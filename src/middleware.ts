import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from '@/lib/supabase/env';

/** Rotas que não exigem sessão (login/cadastro). */
const PUBLIC_PATHS = ['/entrar'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem variáveis de ambiente a página exibe um aviso de configuração;
  // não faz sentido redirecionar para o login antes disso.
  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Renova a sessão (access token), se necessário.
  // Falha de rede/API conta como "sem sessão": redireciona para o login.
  let user = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Roda em todas as rotas, exceto arquivos estáticos do Next.
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)',
  ],
};
