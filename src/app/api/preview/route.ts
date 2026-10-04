import { NextResponse, type NextRequest } from "next/server";
import { ExtractionError, extractProduct } from "@/lib/extraction";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

/** Busca a página do produto e devolve título, preço e imagens candidatas. */
export async function POST(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ ok: false, erro: "nao_autenticado" }, { status: 401 });

  const corpo = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof corpo?.url === "string" ? corpo.url.slice(0, 2048) : "";
  if (!url) return NextResponse.json({ ok: false, erro: "url_invalida" }, { status: 400 });

  const { data: liberado } = await supabase.rpc("check_rate_limit", { p_acao: "preview", p_por_minuto: 20, p_por_dia: 200 });
  if (!liberado) return NextResponse.json({ ok: false, erro: "limite" }, { status: 429 });

  try {
    const produto = await extractProduct(url);
    return NextResponse.json({ ok: true, produto });
  } catch (err) {
    if (err instanceof ExtractionError) {
      return NextResponse.json({ ok: false, erro: err.codigo, status: err.status ?? null });
    }
    console.error("preview", err);
    return NextResponse.json({ ok: false, erro: "falha_rede" });
  }
}
