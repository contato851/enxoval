import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ExtractionError } from "@/lib/extraction";
import { safeFetch } from "@/lib/extraction/safe-fetch";
import { assinarCaminhos, BUCKET_IMAGENS } from "@/lib/imagens";
import { ImagemInvalida, MAX_BYTES_ORIGEM, processarImagem } from "@/lib/images/process";
import { MAX_IMAGENS } from "@/lib/lista";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 20;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const erro = (codigo: string, status: number) => NextResponse.json({ ok: false, erro: codigo }, { status });

/**
 * Recebe uma imagem (arquivo do aparelho ou URL), redimensiona e salva no Storage.
 * Campos: listId, itemId, ordem e "arquivo" (File) ou "url" (texto).
 */
export async function POST(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return erro("nao_autenticado", 401);

  const form = await request.formData().catch(() => null);
  if (!form) return erro("formato", 400);
  const listId = String(form.get("listId") ?? "");
  const itemId = String(form.get("itemId") ?? "");
  const ordem = Math.min(MAX_IMAGENS - 1, Math.max(0, Number(form.get("ordem") ?? 0) || 0));
  if (!UUID.test(listId) || !UUID.test(itemId)) return erro("formato", 400);

  const { data: liberado } = await supabase.rpc("check_rate_limit", { p_acao: "imagem", p_por_minuto: 40, p_por_dia: 400 });
  if (!liberado) return erro("limite", 429);

  // A RLS garante que o item é de uma lista do usuário.
  const { data: item } = await supabase.from("items").select("id").eq("id", itemId).eq("list_id", listId).maybeSingle();
  if (!item) return erro("nao_encontrado", 404);
  const { count } = await supabase.from("item_images").select("id", { count: "exact", head: true }).eq("item_id", itemId);
  if ((count ?? 0) >= MAX_IMAGENS) return erro("limite", 409);

  let original: Buffer;
  const arquivo = form.get("arquivo");
  const url = form.get("url");
  try {
    if (arquivo instanceof File) {
      if (arquivo.size > MAX_BYTES_ORIGEM) return erro("grande", 413);
      original = Buffer.from(await arquivo.arrayBuffer());
    } else if (typeof url === "string" && url) {
      const res = await safeFetch(url, {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
        contentType: /^image\//i,
        maxBytes: MAX_BYTES_ORIGEM,
        aoPassarDoLimite: "erro",
        timeoutMs: 8000,
      });
      if (res.status >= 400) return erro("download", 502);
      original = res.body;
    } else {
      return erro("formato", 400);
    }
  } catch (e) {
    if (e instanceof ExtractionError) {
      if (e.codigo === "muito_grande") return erro("grande", 413);
      if (e.codigo === "tipo_invalido") return erro("formato", 415);
    }
    return erro("download", 502);
  }

  let webp: Buffer;
  try {
    webp = await processarImagem(original);
  } catch (e) {
    if (e instanceof ImagemInvalida) return erro("formato", 415);
    throw e;
  }

  const caminho = `${listId}/${itemId}/${randomUUID()}.webp`;
  const envio = await supabase.storage
    .from(BUCKET_IMAGENS)
    .upload(caminho, webp, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
  if (envio.error) return erro("upload", 500);

  const { data: imagem, error } = await supabase
    .from("item_images")
    .insert({ item_id: itemId, list_id: listId, caminho, ordem })
    .select("*")
    .single();
  if (error || !imagem) {
    await supabase.storage.from(BUCKET_IMAGENS).remove([caminho]);
    return erro(error?.message.includes("limite_imagens") ? "limite" : "upload", error?.message.includes("limite_imagens") ? 409 : 500);
  }

  const urls = await assinarCaminhos(supabase, [caminho]);
  return NextResponse.json({ ok: true, imagem, url: urls[caminho] ?? null });
}
