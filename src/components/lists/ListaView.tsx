"use client";
import { PackageOpen, Plus, SearchX } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CategoryTabs } from "@/components/categories/CategoryTabs";
import { FilterBar } from "@/components/filters/FilterBar";
import { ItemCard } from "@/components/items/ItemCard";
import { SizeCounter } from "@/components/summary/SizeCounter";
import { SummaryBar } from "@/components/summary/SummaryBar";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useListData, type DadosLista } from "@/hooks/useListData";
import { t } from "@/i18n";
import {
  calcularResumo,
  contadoresPorCategoria,
  filtrarItens,
  ordenarCategorias,
  ordenarItens,
  PRIORIDADES,
  STATUS,
  type Filtros,
} from "@/lib/lista";
import type { Item, PrioridadeItem, StatusItem } from "@/lib/types/database";

const GRID_ID = "grid-itens";

export function ListaView({ inicial }: { inicial: DadosLista }) {
  const { dados, erro, recarregar, mudarStatus, excluirItem } = useListData(inicial);
  const avisar = useToast();
  const pathname = usePathname();
  const params = useSearchParams();

  const categorias = useMemo(() => ordenarCategorias(dados.categorias), [dados.categorias]);
  const catParam = params.get("cat");
  const statusParam = params.get("status") as StatusItem | null;
  const prioParam = params.get("prio") as PrioridadeItem | null;
  const filtros: Filtros = {
    categoria: categorias.some((c) => c.id === catParam) ? catParam : null,
    status: statusParam && STATUS.includes(statusParam) ? statusParam : null,
    prioridade: prioParam && PRIORIDADES.includes(prioParam) ? prioParam : null,
    busca: params.get("q") ?? "",
  };

  // A busca responde na hora; a URL é atualizada com um pequeno atraso.
  const [busca, setBusca] = useState(filtros.busca);
  const buscaUrl = filtros.busca;
  useEffect(() => {
    if (busca === buscaUrl) return;
    const id = setTimeout(() => mudarFiltros({ busca }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function mudarFiltros(f: Partial<Filtros>) {
    const p = new URLSearchParams(params.toString());
    const set = (chave: string, v: string | null | undefined) => (v ? p.set(chave, v) : p.delete(chave));
    if ("categoria" in f) set("cat", f.categoria);
    if ("status" in f) set("status", f.status);
    if ("prioridade" in f) set("prio", f.prioridade);
    if ("busca" in f) set("q", f.busca?.trim());
    const qs = p.toString();
    // history.replaceState atualiza a URL (e o useSearchParams) sem ir ao servidor.
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }

  const imagensPorItem = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const im of [...dados.imagens].sort((a, b) => a.ordem - b.ordem)) {
      const url = dados.urls[im.caminho];
      if (!url) continue;
      mapa.set(im.item_id, [...(mapa.get(im.item_id) ?? []), url]);
    }
    return mapa;
  }, [dados.imagens, dados.urls]);

  const resumo = useMemo(() => calcularResumo(dados.itens), [dados.itens]);
  const contador = useMemo(() => contadoresPorCategoria(dados.itens), [dados.itens]);
  const visiveis = useMemo(
    () => ordenarItens(filtrarItens(dados.itens, { ...filtros, busca })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados.itens, filtros.categoria, filtros.status, filtros.prioridade, busca],
  );
  const categoriaAtiva = categorias.find((c) => c.id === filtros.categoria);
  const itensDaCategoria = categoriaAtiva ? dados.itens.filter((i) => i.category_id === categoriaAtiva.id) : [];

  const [excluindo, setExcluindo] = useState<Item | null>(null);
  const novoHref = `/l/${dados.lista.id}/itens/novo${filtros.categoria ? `?categoria=${filtros.categoria}` : ""}`;

  async function trocarStatus(item: Item, status: StatusItem) {
    try {
      await mudarStatus(item.id, status);
      avisar(t.status.alterado(item.nome, t.status[status]));
    } catch {
      avisar(t.comum.erroGenerico, "erro");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SummaryBar resumo={resumo} dataPrevista={dados.lista.data_prevista} />

      <CategoryTabs
        categorias={categorias}
        ativa={filtros.categoria}
        contador={contador}
        aoEscolher={(id) => mudarFiltros({ categoria: id })}
        controla={GRID_ID}
      />

      {categoriaAtiva?.mostra_tamanhos && <SizeCounter itens={itensDaCategoria} />}

      <FilterBar filtros={filtros} busca={busca} aoBuscar={setBusca} aoMudar={mudarFiltros} />

      <div id={GRID_ID} role="tabpanel" aria-label={categoriaAtiva?.nome ?? t.abas.todos}>
        {erro ? (
          <ErrorState texto={t.lista.erroCarregar} aoTentar={recarregar} />
        ) : dados.itens.length === 0 ? (
          <EmptyState
            icone={<PackageOpen className="size-10" />}
            titulo={t.lista.vazia}
            texto={t.lista.vaziaDica}
            acao={
              <LinkButton href={novoHref} icone={<Plus aria-hidden className="size-5" />}>
                {t.nav.adicionar}
              </LinkButton>
            }
          />
        ) : visiveis.length === 0 ? (
          <EmptyState icone={<SearchX className="size-10" />} titulo={t.lista.nadaEncontrado} />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visiveis.map((item) => (
              <li key={item.id} className="h-full">
                <ItemCard
                  item={item}
                  imagens={imagensPorItem.get(item.id) ?? []}
                  listId={dados.lista.id}
                  aoMudarStatus={(s) => trocarStatus(item, s)}
                  aoExcluir={() => setExcluindo(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <LinkButton
        href={novoHref}
        tamanho="lg"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-20 rounded-pilula shadow-flutuante"
        icone={<Plus aria-hidden className="size-5" />}
      >
        {t.nav.adicionar}
      </LinkButton>

      <ConfirmDialog
        aberto={excluindo !== null}
        aoFechar={() => setExcluindo(null)}
        titulo={t.item.excluirTitulo}
        aoConfirmar={async () => {
          if (!excluindo) return;
          await excluirItem(excluindo.id);
          avisar(t.item.excluido);
        }}
      >
        <p>{excluindo && t.item.excluirTexto(excluindo.nome)}</p>
      </ConfirmDialog>
    </div>
  );
}
