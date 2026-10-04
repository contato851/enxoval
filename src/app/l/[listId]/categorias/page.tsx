import type { Metadata } from "next";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { t } from "@/i18n";
import { carregarLista } from "@/lib/dados-lista";

export const metadata: Metadata = { title: t.categorias.titulo };

export default async function Categorias({ params }: PageProps<"/l/[listId]/categorias">) {
  const { listId } = await params;
  const { supabase } = await carregarLista(listId);
  const [cats, itens] = await Promise.all([
    supabase.from("categories").select("*").eq("list_id", listId),
    supabase.from("items").select("category_id").eq("list_id", listId),
  ]);
  if (cats.error || itens.error) throw cats.error ?? itens.error;
  const contagem: Record<string, number> = {};
  for (const i of itens.data) contagem[i.category_id] = (contagem[i.category_id] ?? 0) + 1;

  return (
    <div className="mx-auto flex max-w-formulario flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{t.categorias.titulo}</h1>
        <p className="text-texto-suave">{t.categorias.dica}</p>
      </div>
      <CategoryManager key={cats.data.map((c) => c.id + c.ordem).join()} listId={listId} categorias={cats.data} itensPorCategoria={contagem} />
    </div>
  );
}
