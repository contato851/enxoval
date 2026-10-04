"use server";
import { cookies } from "next/headers";
import { COOKIE_DESTINO, emailPermitido, destinoSeguro } from "@/lib/auth/allowlist";
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
  // O destino pós-login vai num cookie: a URL de retorno fica fixa e bate com a lista
  // de Redirect URLs do Supabase sem depender de query string.
  const cookieStore = await cookies();
  if (next !== "/") {
    cookieStore.set(COOKIE_DESTINO, next, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60, path: "/" });
  } else {
    cookieStore.delete(COOKIE_DESTINO);
  }
  const callback = new URL("/auth/callback", await siteUrl());

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
