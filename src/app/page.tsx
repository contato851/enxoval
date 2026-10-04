import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

/** Página inicial: abre a última lista usada, a primeira lista, ou a tela de listas. */
export default async function Inicio() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const { data: membros } = await supabase
    .from("list_members")
    .select("list_id, criado_em")
    .eq("user_id", user.id)
    .order("criado_em");
  const ids = (membros ?? []).map((m) => m.list_id);
  const ultima = (await cookies()).get("ultima_lista")?.value;

  if (ultima && ids.includes(ultima)) redirect(`/l/${ultima}`);
  if (ids.length > 0) redirect(`/l/${ids[0]}`);
  redirect("/listas");
}
