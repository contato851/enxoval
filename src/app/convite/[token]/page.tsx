import { MailOpen } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LinkButton } from "@/components/ui/Button";
import { t } from "@/i18n";
import { getUser } from "@/lib/supabase/server";
import { AceitarConvite } from "./AceitarConvite";

export const metadata: Metadata = { title: t.convite.titulo };

export default async function Convite({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const { supabase, user } = await getUser();
  if (!user) redirect(`/login?next=/convite/${token}`);

  const { data } = await supabase.rpc("invite_preview", { p_token: token });
  const convite = data?.[0];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-formulario flex-col justify-center gap-6 px-4 py-10 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-pilula bg-destaque-suave text-destaque">
        <MailOpen aria-hidden className="size-8" />
      </span>
      <h1 className="text-2xl font-bold">{t.convite.titulo}</h1>
      {convite?.valido ? (
        <>
          <p className="text-lg">{t.convite.texto(convite.list_nome)}</p>
          <AceitarConvite token={token} />
        </>
      ) : (
        <>
          <p role="alert" className="text-perigo">
            {t.convite.invalido}
          </p>
          <LinkButton href="/" variante="secundario">
            {t.erros.voltarInicio}
          </LinkButton>
        </>
      )}
    </main>
  );
}
