import type { Metadata } from "next";
import { ListaView } from "@/components/lists/ListaView";
import { carregarDadosLista } from "@/lib/dados-lista";

export const metadata: Metadata = { title: "Lista" };

export default async function PaginaLista({ params }: PageProps<"/l/[listId]">) {
  const { listId } = await params;
  const dados = await carregarDadosLista(listId);
  return (
    <>
      <h1 className="sr-only">{dados.lista.nome}</h1>
      <ListaView key={listId} inicial={dados} />
    </>
  );
}
