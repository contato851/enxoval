import "server-only";
import { notFound } from "next/navigation";
import type { DadosLista } from "@/hooks/useListData";
import { assinarCaminhos } from "@/lib/imagens";
import { getUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lista acessível ao usuário (a RLS garante); 404 se não existir ou não for membro. */
export async function carregarLista(listId: string) {
  if (!UUID.test(listId)) notFound();
  const { supabase, user } = await getUser();
  if (!user) notFound();
  const { data: lista } = await supabase.from("lists").select("*").eq("id", listId).maybeSingle();
  if (!lista) notFound();
  const { data: membro } = await supabase
    .from("list_members")
    .select("papel")
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .maybeSingle();
  return { supabase, user, lista, papel: membro?.papel ?? "editor" };
}

export async function carregarDadosLista(listId: string): Promise<DadosLista> {
  const { supabase, lista } = await carregarLista(listId);
  const [c, i, im] = await Promise.all([
    supabase.from("categories").select("*").eq("list_id", listId),
    supabase.from("items").select("*").eq("list_id", listId),
    supabase.from("item_images").select("*").eq("list_id", listId),
  ]);
  if (c.error) throw c.error;
  if (i.error) throw i.error;
  if (im.error) throw im.error;
  const urls = await assinarCaminhos(supabase, im.data.map((x) => x.caminho));
  return { lista, categorias: c.data, itens: i.data, imagens: im.data, urls };
}
