import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { emailPermitido } from "@/lib/auth/allowlist";
import type { Database } from "@/lib/types/database";
import { supabasePublicEnv } from "./env";

const ROTAS_PUBLICAS = ["/login", "/auth/", "/offline"];
const UUID = /^\/l\/([0-9a-f-]{36})(\/|$)/i;

/** Renova a sessão do Supabase em toda requisição e barra quem não pode entrar. */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabasePublicEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims (recomendação do Supabase).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const caminho = request.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.some((r) => caminho === r || caminho.startsWith(r));

  const logado = Boolean(claims?.sub) && emailPermitido(claims?.email as string | undefined);

  if (!logado && !publica) {
    if (caminho.startsWith("/api/")) {
      return NextResponse.json({ ok: false, erro: "nao_autenticado" }, { status: 401 });
    }
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    if (caminho !== "/") destino.searchParams.set("next", caminho + request.nextUrl.search);
    if (claims?.sub) destino.searchParams.set("erro", "nao_autorizado");
    const redirect = NextResponse.redirect(destino);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // Lembra a última lista aberta para a página inicial abrir direto nela.
  const lista = caminho.match(UUID)?.[1];
  if (lista && request.cookies.get("ultima_lista")?.value !== lista) {
    response.cookies.set("ultima_lista", lista, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}
