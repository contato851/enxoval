"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function aceitarConvite(token: string): Promise<{ erro: boolean }> {
  const supabase = await createClient();
  const { data: listId, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error || !listId) return { erro: true };
  redirect(`/l/${listId}`);
}
