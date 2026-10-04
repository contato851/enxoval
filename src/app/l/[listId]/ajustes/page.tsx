import type { Metadata } from "next";
import { t } from "@/i18n";
import { carregarLista } from "@/lib/dados-lista";
import { Ajustes } from "./Ajustes";

export const metadata: Metadata = { title: t.ajustes.titulo };

export default async function PaginaAjustes({ params }: PageProps<"/l/[listId]/ajustes">) {
  const { listId } = await params;
  const { supabase, user, lista, papel } = await carregarLista(listId);
  const { data: membros, error } = await supabase.rpc("list_members_with_email", { p_list: listId });
  if (error) throw error;

  return (
    <div className="mx-auto flex max-w-formulario flex-col gap-4">
      <h1 className="text-xl font-bold">{t.ajustes.titulo}</h1>
      <Ajustes lista={lista} dono={papel === "dono"} membros={membros ?? []} usuarioId={user.id} />
    </div>
  );
}
