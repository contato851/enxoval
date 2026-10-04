import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro, emailPermitido } from "@/lib/auth/allowlist";
import { createClient } from "@/lib/supabase/server";

/** Retorno do magic link: cria a sessão e confere a allowlist de novo. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = destinoSeguro(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let erro = true;
  if (code) {
    erro = Boolean((await supabase.auth.exchangeCodeForSession(code)).error);
  } else if (tokenHash && type) {
    erro = Boolean((await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error);
  }
  if (erro) return NextResponse.redirect(new URL("/login?erro=link_invalido", origin));

  const { data } = await supabase.auth.getUser();
  if (!emailPermitido(data.user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?erro=nao_autorizado", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
