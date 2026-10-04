import type { Metadata } from "next";
import { ItemForm } from "@/components/items/ItemForm";
import { t } from "@/i18n";
import { carregarLista } from "@/lib/dados-lista";
import { ordenarCategorias } from "@/lib/lista";

export const metadata: Metadata = { title: t.form.novoTitulo };

export default async function NovoItem({ params, searchParams }: PageProps<"/l/[listId]/itens/novo">) {
  const { listId } = await params;
  const sp = await searchParams;
  const { supabase } = await carregarLista(listId);
  const { data: categorias, error } = await supabase.from("categories").select("*").eq("list_id", listId);
  if (error) throw error;

  return (
    <div className="mx-auto flex max-w-formulario flex-col gap-4">
      <h1 className="text-xl font-bold">{t.form.novoTitulo}</h1>
      <ItemForm
        listId={listId}
        categorias={ordenarCategorias(categorias)}
        urlInicial={typeof sp.url === "string" ? sp.url : undefined}
        categoriaInicial={typeof sp.categoria === "string" ? sp.categoria : undefined}
      />
    </div>
  );
}
