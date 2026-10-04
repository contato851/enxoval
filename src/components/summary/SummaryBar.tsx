import { CalendarHeart } from "lucide-react";
import { t } from "@/i18n";
import { diasAte, formatarReais } from "@/lib/format";
import type { Resumo } from "@/lib/lista";

export function SummaryBar({ resumo, dataPrevista }: { resumo: Resumo; dataPrevista: string | null }) {
  const pct = resumo.total ? Math.round((resumo.resolvidos / resumo.total) * 100) : 0;
  const dias = diasAte(dataPrevista);
  const contagem =
    dias === null ? t.resumo.semData : dias > 0 ? t.resumo.faltamDias(dias) : dias === 0 ? t.resumo.hoje : t.resumo.passou(-dias);

  return (
    <section aria-label={t.resumo.titulo} className="flex flex-col gap-3 rounded-card bg-superficie p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-destaque-forte">
          <CalendarHeart aria-hidden className="size-4" />
          {contagem}
        </p>
        <p className="text-sm text-texto-suave">{t.resumo.progresso(resumo.resolvidos, resumo.total)}</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={t.resumo.progresso(resumo.resolvidos, resumo.total)}
        className="h-2.5 overflow-hidden rounded-pilula bg-superficie-suave"
      >
        <div className="h-full rounded-pilula bg-destaque transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center" title={t.resumo.explicacao}>
        {[
          [t.resumo.previsto, resumo.previsto],
          [t.resumo.gasto, resumo.gasto],
          [t.resumo.falta, resumo.falta],
        ].map(([rotulo, valor]) => (
          <div key={rotulo as string} className="flex flex-col rounded-controle bg-fundo px-1 py-2">
            <dt className="text-xs text-texto-suave">{rotulo}</dt>
            <dd className="truncate text-sm font-bold tabular-nums sm:text-base">{formatarReais(valor as number)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
