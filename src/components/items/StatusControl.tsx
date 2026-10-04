"use client";
import { Check, Circle, Gift } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { t } from "@/i18n";
import { STATUS } from "@/lib/lista";
import type { StatusItem } from "@/lib/types/database";

const ICONE = { a_comprar: Circle, comprado: Check, ganhamos: Gift } as const;
const ATIVO: Record<StatusItem, string> = {
  a_comprar: "bg-status-comprar-suave text-status-comprar border-status-comprar",
  comprado: "bg-status-comprado-suave text-status-comprado border-status-comprado",
  ganhamos: "bg-status-ganhamos-suave text-status-ganhamos border-status-ganhamos",
};

/** Três botões: um toque troca o status. */
export function StatusControl({
  valor,
  nome,
  aoMudar,
}: {
  valor: StatusItem;
  nome: string;
  aoMudar: (s: StatusItem) => void;
}) {
  return (
    <div role="group" aria-label={`${t.status.rotulo}: ${nome}`} className="grid grid-cols-3 gap-1">
      {STATUS.map((s) => {
        const Icone = ICONE[s];
        const ativo = s === valor;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={ativo}
            onClick={() => !ativo && aoMudar(s)}
            className={cn(
              "flex h-13 flex-col items-center justify-center gap-0.5 rounded-controle border px-1 text-xs font-semibold leading-4 transition-colors",
              ativo ? ATIVO[s] : "border-borda bg-superficie text-texto-suave hover:bg-superficie-suave",
            )}
          >
            <Icone aria-hidden className="size-4 shrink-0" />
            <span className="max-w-full truncate">{t.status[s]}</span>
          </button>
        );
      })}
    </div>
  );
}
