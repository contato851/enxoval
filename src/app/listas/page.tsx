import { ChevronRight, LogOut, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LinkButton } from "@/components/ui/Button";
import { t } from "@/i18n";
import { diasAte } from "@/lib/format";
import { getUser } from "@/lib/supabase/server";
import { CreateListForm } from "./CreateListForm";

export const metadata: Metadata = { title: t.listas.titulo };

export default async function Listas() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const [{ data: membros, error }, { data: tipos }] = await Promise.all([
    supabase
      .from("list_members")
      .select("papel, lists(id, nome, data_prevista)")
      .eq("user_id", user.id)
      .order("criado_em"),
    supabase.from("list_templates").select("tipo, nome"),
  ]);
  if (error) throw error;

  const listas = (membros ?? []).flatMap((m) => {
    const l = m.lists as unknown as { id: string; nome: string; data_prevista: string | null } | null;
    return l ? [{ ...l, papel: m.papel }] : [];
  });

  return (
    <main className="mx-auto flex w-full max-w-formulario flex-col gap-6 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.listas.titulo}</h1>
        <div className="flex gap-1">
          <LinkButton href="/conta" variante="fantasma" tamanho="sm" aria-label={t.nav.conta}>
            <UserRound aria-hidden className="size-5" />
          </LinkButton>
          <form action="/auth/sair" method="post">
            <button
              type="submit"
              aria-label={t.login.sair}
              title={t.login.sair}
              className="flex size-9 items-center justify-center rounded-controle text-texto-suave hover:bg-superficie-suave"
            >
              <LogOut aria-hidden className="size-5" />
            </button>
          </form>
        </div>
      </div>

      {listas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {listas.map((l) => {
            const dias = diasAte(l.data_prevista);
            return (
              <li key={l.id}>
                <Link
                  href={`/l/${l.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-card bg-superficie px-4 py-3 shadow-card hover:bg-superficie-suave"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{l.nome}</span>
                    <span className="text-sm text-texto-suave">
                      {t.listas.papel[l.papel]}
                      {dias !== null && dias >= 0 && ` · ${dias === 0 ? t.resumo.hoje : t.resumo.faltamDias(dias)}`}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 text-texto-suave" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">{t.listas.nenhuma}</p>
          <p className="text-texto-suave">{t.listas.nenhumaDica}</p>
        </div>
      )}

      <section aria-labelledby="criar-lista" className="rounded-card bg-superficie p-5 shadow-card">
        <h2 id="criar-lista" className="mb-4 text-lg font-semibold">
          {listas.length > 0 ? t.listas.criar : t.listas.criarPrimeira}
        </h2>
        <CreateListForm tipos={tipos ?? []} />
      </section>
    </main>
  );
}
