import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/items/ItemForm";
import type { ImagemEscolhida } from "@/components/items/ImagePicker";
import { t } from "@/i18n";
import { carregarLista } from "@/lib/dados-lista";
import { assinarCaminhos } from "@/lib/imagens";
import { ordenarCategorias } from "@/lib/lista";

export const metadata: Metadata = { title: t.form.editarTitulo };

export default async function EditarItem({ params }: PageProps<"/l/[listId]/itens/[itemId]">) {
  const { listId, itemId } = await params;
  const { supabase } = await carregarLista(listId);
  const [cats, item, imgs] = await Promise.all([
    supabase.from("categories").select("*").eq("list_id", listId),
    supabase.from("items").select("*").eq("id", itemId).eq("list_id", listId).maybeSingle(),
    supabase.from("item_images").select("*").eq("item_id", itemId).order("ordem"),
  ]);
  if (cats.error || imgs.error) throw cats.error ?? imgs.error;
  if (!item.data) notFound();

  const urls = await assinarCaminhos(supabase, imgs.data.map((i) => i.caminho));
  const imagens: ImagemEscolhida[] = imgs.data
    .filter((i) => urls[i.caminho])
    .map((i) => ({ chave: i.id, tipo: "existente", id: i.id, caminho: i.caminho, url: urls[i.caminho] }));

  return (
    <div className="mx-auto flex max-w-formulario flex-col gap-4">
      <h1 className="text-xl font-bold">{t.form.editarTitulo}</h1>
      <ItemForm listId={listId} categorias={ordenarCategorias(cats.data)} item={item.data} imagensIniciais={imagens} />
    </div>
  );
}
