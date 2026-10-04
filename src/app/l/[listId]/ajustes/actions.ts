"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { BUCKET_IMAGENS } from "@/lib/imagens";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type Estado = { ok: boolean; mensagem: string | null };

export async function salvarDados(listId: string, _: Estado, form: FormData): Promise<Estado> {
  const nome = String(form.get("nome") ?? "").trim();
  const data = String(form.get("data_prevista") ?? "") || null;
  if (!nome) return { ok: false, mensagem: t.listas.nomeObrigatorio };
  const supabase = await createClient();
  const { data: linhas, error } = await supabase
    .from("lists")
    .update({ nome: nome.slice(0, 60), data_prevista: data })
    .eq("id", listId)
    .select("id");
  if (error) return { ok: false, mensagem: t.comum.erroGenerico };
  if (!linhas?.length) return { ok: false, mensagem: t.ajustes.soDono };
  revalidatePath(`/l/${listId}`, "layout");
  return { ok: true, mensagem: t.ajustes.salvo };
}

export async function gerarConvite(listId: string): Promise<{ link: string | null; erro: string | null }> {
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_invite", { p_list: listId });
  if (error || !token) return { link: null, erro: t.ajustes.soDono };
  return { link: `${await siteUrl()}/convite/${token}`, erro: null };
}

export async function removerMembro(listId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("list_members").delete().eq("list_id", listId).eq("user_id", userId);
  if (error) throw new Error(t.comum.erroGenerico);
  revalidatePath(`/l/${listId}/ajustes`);
}

export async function sairDaLista(listId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data, error } = await supabase
    .from("list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", auth.user.id)
    .select("list_id");
  if (error || !data?.length) throw new Error(t.comum.erroGenerico);
  redirect("/listas");
}

export async function excluirLista(listId: string) {
  const supabase = await createClient();
  const { data: dono } = await supabase.rpc("is_list_owner", { p_list: listId });
  if (!dono) throw new Error(t.ajustes.soDono);

  // Primeiro as imagens do Storage (o banco não apaga arquivos sozinho).
  const { data: imagens } = await supabase.from("item_images").select("caminho").eq("list_id", listId);
  const caminhos = (imagens ?? []).map((i) => i.caminho);
  for (let i = 0; i < caminhos.length; i += 100) {
    await supabase.storage.from(BUCKET_IMAGENS).remove(caminhos.slice(i, i + 100));
  }
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw new Error(t.comum.erroGenerico);
  redirect("/listas");
}
