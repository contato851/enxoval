"use client";
import { LayoutGrid } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { t } from "@/i18n";
import type { Categoria } from "@/lib/types/database";
import { CategoryIcon } from "./CategoryIcon";

type Props = {
  categorias: Categoria[];
  ativa: string | null;
  contador: (id: string | null) => { feitos: number; total: number };
  aoEscolher: (id: string | null) => void;
  controla: string;
};

/** Abas de mesmo tamanho, com ícone e contador. Rolagem horizontal no celular; setas no teclado. */
export function CategoryTabs({ categorias, ativa, contador, aoEscolher, controla }: Props) {
  const abas: { id: string | null; nome: string; icone: string | null }[] = [
    { id: null, nome: t.abas.todos, icone: null },
    ...categorias.map((c) => ({ id: c.id, nome: c.nome, icone: c.icone })),
  ];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const indiceAtivo = Math.max(0, abas.findIndex((a) => a.id === ativa));

  useEffect(() => {
    refs.current[indiceAtivo]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [indiceAtivo]);

  function mover(delta: number) {
    const i = (indiceAtivo + delta + abas.length) % abas.length;
    aoEscolher(abas[i].id);
    refs.current[i]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={t.abas.rotulo}
      className="scroll-sem-barra -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") mover(1);
        else if (e.key === "ArrowLeft") mover(-1);
        else if (e.key === "Home") mover(-indiceAtivo);
        else if (e.key === "End") mover(abas.length - 1 - indiceAtivo);
        else return;
        e.preventDefault();
      }}
    >
      {abas.map((aba, i) => {
        const selecionada = i === indiceAtivo;
        const { feitos, total } = contador(aba.id);
        return (
          <button
            key={aba.id ?? "todos"}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selecionada}
            aria-controls={controla}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => aoEscolher(aba.id)}
            className={cn(
              "flex h-20 w-aba shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-card border px-2 transition-colors",
              selecionada
                ? "border-destaque bg-destaque text-superficie"
                : "border-borda bg-superficie text-texto hover:bg-superficie-suave",
            )}
          >
            {aba.icone ? (
              <CategoryIcon icone={aba.icone} className="size-5" />
            ) : (
              <LayoutGrid aria-hidden className="size-5" />
            )}
            <span className="w-full truncate text-center text-sm font-semibold">{aba.nome}</span>
            <span
              className={cn("text-xs tabular-nums", selecionada ? "text-superficie" : "text-texto-suave")}
              aria-label={t.abas.contadorLongo(feitos, total)}
            >
              {t.abas.contador(feitos, total)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
