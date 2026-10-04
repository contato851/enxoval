import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Saída para a loja: registra o clique e redireciona para url_saida.
 * Só aceita o id do item (nunca uma URL por parâmetro), então não vira open redirect.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/ir/[itemId]">) {
  const { itemId } = await ctx.params;
  const origem = request.nextUrl.origin;
  if (!UUID.test(itemId)) return NextResponse.redirect(new URL("/", origem));

  const { supabase, user } = await getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=/ir/${itemId}`, origem));

  const { data: item } = await supabase
    .from("items")
    .select("id, list_id, loja, url_saida")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return NextResponse.redirect(new URL("/", origem));
  if (!item.url_saida || !/^https?:\/\//i.test(item.url_saida)) {
    return NextResponse.redirect(new URL(`/l/${item.list_id}`, origem));
  }

  await supabase.from("link_clicks").insert({ item_id: item.id, list_id: item.list_id, loja: item.loja, user_id: user.id });

  const res = NextResponse.redirect(item.url_saida, 302);
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
