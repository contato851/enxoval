"use server";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_IMAGENS } from "@/lib/imagens";
import { createClient } from "@/lib/supabase/server";

/**
 * Exclui a conta: apaga as listas em que o usuário é o único membro (com imagens),
 * passa a posse das compartilhadas e remove o usuário do Auth.
 */
export async function excluirConta(confirmacao: string) {
  if (confirmacao.trim() !== t.conta.palavra) throw new Error(t.comum.erroGenerico);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: caminhos, error } = await supabase.rpc("delete_account_data");
  if (error) throw new Error(t.comum.erroGenerico);

  const admin = createAdminClient();
  const lista = (caminhos ?? []) as string[];
  for (let i = 0; i < lista.length; i += 100) {
    await admin.storage.from(BUCKET_IMAGENS).remove(lista.slice(i, i + 100));
  }
  const { error: erroAuth } = await admin.auth.admin.deleteUser(auth.user.id);
  if (erroAuth) throw new Error(t.comum.erroGenerico);

  await supabase.auth.signOut();
  redirect("/login?conta=excluida");
}
