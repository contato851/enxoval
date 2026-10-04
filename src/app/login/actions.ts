"use server";
import { emailPermitido, destinoSeguro } from "@/lib/auth/allowlist";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n";

export type EstadoLogin = { ok: boolean; mensagem: string | null; email?: string };

export async function enviarLink(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = destinoSeguro(String(form.get("next") ?? ""));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, mensagem: t.login.emailInvalido, email };
  }
  if (!emailPermitido(email)) {
    return { ok: false, mensagem: t.login.naoAutorizado, email };
  }

  const supabase = await createClient();
  const callback = new URL("/auth/callback", await siteUrl());
  if (next !== "/") callback.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });
  if (error) {
    const limite = error.status === 429 || /rate limit/i.test(error.message);
    return { ok: false, mensagem: limite ? t.login.muitasTentativas : t.comum.erroGenerico, email };
  }
  return { ok: true, mensagem: t.login.enviado(email), email };
}
