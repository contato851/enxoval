"use client";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/Dialog";
import { t } from "@/i18n";
import { formatarReais } from "@/lib/format";
import { resolvido } from "@/lib/lista";
import type { Item, StatusItem } from "@/lib/types/database";
import { ImageCarousel } from "./ImageCarousel";
import { StatusControl } from "./StatusControl";

type Props = {
  item: Item;
  imagens: string[];
  listId: string;
  aoMudarStatus: (s: StatusItem) => void;
  aoExcluir: () => void;
};

/**
 * Card padronizado. Todas as linhas têm altura fixa, então todos os cards do grid
 * ficam idênticos: imagem 1:1, título (2 linhas), preço, loja + ações,
 * observações (3 linhas + "ver mais") e status.
 */
export function ItemCard({ item, imagens, listId, aoMudarStatus, aoExcluir }: Props) {
  const atenuado = resolvido(item.status);
  const [notasAbertas, setNotasAbertas] = useState(false);
  const notasRef = useRef<HTMLParagraphElement>(null);
  const [transborda, setTransborda] = useState(false);

  useLayoutEffect(() => {
    const el = notasRef.current;
    if (el) setTransborda(el.scrollHeight > el.clientHeight + 1);
  }, [item.observacoes]);

  return (
    <article
      aria-label={item.nome}
      className="flex h-full flex-col gap-3 rounded-card border border-borda bg-superficie p-3 shadow-card"
    >
      <div className="relative">
        <ImageCarousel urls={imagens} alt={item.nome} atenuada={atenuado} />
        {item.prioridade === "essencial" && (
          <span className="absolute left-2 top-2 rounded-pilula bg-essencial-suave px-2 py-0.5 text-xs font-semibold text-essencial">
            {t.prioridade.essencial}
          </span>
        )}
      </div>

      <div className={cn("flex flex-col gap-1", atenuado && "opacity-60")}>
        <h3 className="line-clamp-2 h-12 text-base font-semibold leading-6" title={item.nome}>
          {item.nome}
        </h3>

        <div className="flex h-6 items-baseline justify-between gap-2">
          <p className="truncate">
            {item.preco !== null ? (
              <span className="text-lg font-bold">{formatarReais(item.preco)}</span>
            ) : (
              <span className="text-sm text-texto-suave">{t.item.semPreco}</span>
            )}
            {item.quantidade > 1 && <span className="ml-1 text-sm text-texto-suave">{t.item.quantidade(item.quantidade)}</span>}
          </p>
          {item.tamanho && (
            <span className="shrink-0 rounded-pilula border border-borda px-2 text-xs font-semibold text-texto-suave">
              {item.tamanho}
            </span>
          )}
        </div>
      </div>

      <div className="flex h-11 items-center gap-1">
        {item.url_saida && item.loja ? (
          <a
            href={`/ir/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.item.abrirLoja(item.loja)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-controle text-sm font-medium text-destaque-forte underline-offset-2 hover:underline"
          >
            <ExternalLink aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{item.loja}</span>
          </a>
        ) : (
          <span className="flex-1 text-sm text-texto-suave">{t.item.semLink}</span>
        )}
        <Link
          href={`/l/${listId}/itens/${item.id}`}
          aria-label={`${t.comum.editar}: ${item.nome}`}
          title={t.comum.editar}
          className="flex size-11 items-center justify-center rounded-controle text-texto-suave hover:bg-superficie-suave hover:text-texto"
        >
          <Pencil aria-hidden className="size-4" />
        </Link>
        <IconButton rotulo={`${t.comum.excluir}: ${item.nome}`} variante="perigo" onClick={aoExcluir}>
          <Trash2 aria-hidden className="size-4" />
        </IconButton>
      </div>

      <div className={cn("flex flex-col", atenuado && "opacity-60")}>
        <p ref={notasRef} className="line-clamp-3 h-15 whitespace-pre-line text-sm leading-5 text-texto-suave">
          {item.observacoes}
        </p>
        <div className="h-6">
          {transborda && (
            <button
              type="button"
              onClick={() => setNotasAbertas(true)}
              className="text-sm font-semibold text-destaque-forte underline underline-offset-2"
            >
              {t.item.verMais}
            </button>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <StatusControl valor={item.status} nome={item.nome} aoMudar={aoMudarStatus} />
      </div>

      <Dialog aberto={notasAbertas} aoFechar={() => setNotasAbertas(false)} titulo={item.nome}>
        <h3 className="mb-2 text-sm font-semibold text-texto-suave">{t.item.observacoes}</h3>
        <p className="whitespace-pre-line">{item.observacoes}</p>
      </Dialog>
    </article>
  );
}
