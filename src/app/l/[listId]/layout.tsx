import { AppHeader } from "@/components/layout/AppHeader";
import { carregarLista } from "@/lib/dados-lista";

export default async function LayoutLista({ children, params }: LayoutProps<"/l/[listId]">) {
  const { listId } = await params;
  const { lista } = await carregarLista(listId);
  return (
    <>
      <AppHeader listId={lista.id} nome={lista.nome} />
      <main className="mx-auto w-full max-w-conteudo px-4 pb-28 pt-4">{children}</main>
    </>
  );
}
