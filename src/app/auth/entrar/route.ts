import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/auth/allowlist";
import { CONTA_COMPARTILHADA } from "@/lib/auth/conta-compartilhada";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Abre a sessão da conta compartilhada sem enviar email e segue para o destino. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = destinoSeguro(searchParams.get("next"));
  const admin = createAdminClient();

  // Cria a conta na primeira vez; nas seguintes o Supabase responde que ela já existe.
  await admin.auth.admin.createUser({ email: CONTA_COMPARTILHADA, email_confirm: true });

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: CONTA_COMPARTILHADA });
  const sessao = error
    ? { error }
    : await (await createClient()).auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
  if (sessao.error) {
    console.error("entrar", sessao.error);
    return new NextResponse("Não foi possível entrar agora. Tente de novo em instantes.", { status: 500 });
  }

  return NextResponse.redirect(new URL(next, origin));
}
