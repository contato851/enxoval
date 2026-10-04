import { ArrowLeft, LogOut } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/Button";
import { t } from "@/i18n";
import { getUser } from "@/lib/supabase/server";
import { ExcluirConta } from "./ExcluirConta";

export const metadata: Metadata = { title: t.conta.titulo };

export default async function Conta() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-formulario flex-col gap-4 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <LinkButton href="/" variante="fantasma" tamanho="sm" className="self-start" icone={<ArrowLeft aria-hidden className="size-4" />}>
        {t.comum.voltar}
      </LinkButton>
      <h1 className="text-2xl font-bold">{t.conta.titulo}</h1>
      <section className="flex flex-col gap-3 rounded-card bg-superficie p-5 shadow-card">
        <p>
          <span className="text-sm text-texto-suave">{t.conta.email}</span>
          <br />
          <span className="font-semibold">{user.email}</span>
        </p>
        <form action="/auth/sair" method="post">
          <Button type="submit" variante="secundario" icone={<LogOut aria-hidden className="size-4" />}>
            {t.login.sair}
          </Button>
        </form>
      </section>
      <section className="flex flex-col gap-3 rounded-card bg-superficie p-5 shadow-card">
        <h2 className="text-lg font-semibold">{t.ajustes.perigo}</h2>
        <ExcluirConta />
      </section>
    </main>
  );
}
