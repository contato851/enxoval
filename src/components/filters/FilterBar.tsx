"use client";
import { Search, X } from "lucide-react";
import { campoClasses } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";
import { t } from "@/i18n";
import { PRIORIDADES, STATUS, type Filtros } from "@/lib/lista";
import type { PrioridadeItem, StatusItem } from "@/lib/types/database";

type Props = {
  filtros: Filtros;
  busca: string;
  aoBuscar: (v: string) => void;
  aoMudar: (f: Partial<Filtros>) => void;
};

export function FilterBar({ filtros, busca, aoBuscar, aoMudar }: Props) {
  const ativos = Boolean(filtros.status || filtros.prioridade || busca);
  return (
    <search aria-label={t.filtros.rotulo} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="relative flex-1">
        <span className="sr-only">{t.filtros.busca}</span>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-suave" />
        <input
          type="search"
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
          placeholder={t.filtros.placeholderBusca}
          enterKeyHint="search"
          className={cn(campoClasses, "h-11 pl-9")}
        />
      </label>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <label>
          <span className="sr-only">{t.filtros.status}</span>
          <select
            value={filtros.status ?? ""}
            onChange={(e) => aoMudar({ status: (e.target.value || null) as StatusItem | null })}
            className={cn(campoClasses, "h-11 sm:w-52")}
          >
            <option value="">{t.filtros.todosStatus}</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {t.status[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{t.filtros.prioridade}</span>
          <select
            value={filtros.prioridade ?? ""}
            onChange={(e) => aoMudar({ prioridade: (e.target.value || null) as PrioridadeItem | null })}
            className={cn(campoClasses, "h-11 sm:w-56")}
          >
            <option value="">{t.filtros.todasPrioridades}</option>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {t.prioridade[p]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {ativos && (
        <button
          type="button"
          onClick={() => {
            aoBuscar("");
            aoMudar({ status: null, prioridade: null });
          }}
          className="flex h-11 items-center justify-center gap-1 rounded-controle px-3 text-sm font-semibold text-texto-suave hover:bg-superficie-suave"
        >
          <X aria-hidden className="size-4" />
          {t.filtros.limpar}
        </button>
      )}
    </search>
  );
}
