"use server";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { createClient } from "@/lib/supabase/server";

export type EstadoCriarLista = { erro: string | null };

export async function criarLista(_: EstadoCriarLista, form: FormData): Promise<EstadoCriarLista> {
  const nome = String(form.get("nome") ?? "").trim();
  const tipo = String(form.get("tipo") ?? "bebe");
  const data = String(form.get("data_prevista") ?? "") || null;
  if (!nome) return { erro: t.listas.nomeObrigatorio };
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: t.comum.erroGenerico };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_list", {
    p_nome: nome.slice(0, 60),
    p_tipo: tipo,
    p_data_prevista: data,
  });
  if (error || !id) {
    return { erro: error?.message.includes("limite_listas") ? t.listas.limite : t.comum.erroGenerico };
  }
  redirect(`/l/${id}`);
}
