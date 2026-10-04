import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export const BUCKET_IMAGENS = "item-images";
const VALIDADE_URL = 60 * 60 * 12; // 12 horas

/** Gera URLs assinadas (bucket privado) para vários caminhos de uma vez. */
export async function assinarCaminhos(
  supabase: SupabaseClient<Database>,
  caminhos: string[],
): Promise<Record<string, string>> {
  if (caminhos.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET_IMAGENS).createSignedUrls(caminhos, VALIDADE_URL);
  const mapa: Record<string, string> = {};
  for (const d of data ?? []) {
    if (d.path && d.signedUrl) mapa[d.path] = d.signedUrl;
  }
  return mapa;
}
